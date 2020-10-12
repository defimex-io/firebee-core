import { Address, DB, Store } from "keystore_wdc/lib";
import { User, MAX_LEVEL , ZERO_ADDRESS, X3, X6} from "./types";
import {Context, Globals, U256} from "keystore_wdc/lib/index";

class UserDB{
    static USER_DB = Store.from<Address, ArrayBuffer>('user')

    hasUser(addr: Address): bool{
        return UserDB.USER_DB.has(addr);
    }
    getUser(addr: Address): User{
        return User.fromEncoded(UserDB.USER_DB.get(addr));
    }

    setUser(addr: Address, u: User): void{
        UserDB.USER_DB.set(addr, u.getEncoded());
    }

    removeUser(addr: Address): void{
        UserDB.USER_DB.remove(addr);
    }
}

const idToAddress = Store.from<u64, Address>('idToAddress');
const userIds = Store.from<u64, Address>('userIds');
const levelPrice = Store.from<u64, u64>('levelPrice');
const firstPrice = 10;

export function init(ownerAddress: Address, lastUserId: u256): Address {
    //当前最新的可用ID，由于合约部署时，创始人会使用1作为ID，因此从2开始作为当前最新可用ID
    Globals.set<u256>('lastUserId', lastUserId);
    // ownerAddress
    //第一个等级是价格设定
    levelPrice.set(1, firstPrice);

    //每个等级的激活价格都是前一个等级的两倍
    for (var i = 2; i <= MAX_LEVEL; i++) {
        let nextLeverPrice = levelPrice.get(i-1) * 2;
        levelPrice.set(i, nextLeverPrice);
    }

    //将合约部署人的地址赋值到owner属性
    //owner是可以提供方法修改的，相当于切换合约管理员
    Globals.set<Address>('owner', ownerAddress);

    //将创始人，也就是合约部署者的地址定义为ID为1的用户
    let user = new User(1,ZERO_ADDRESS,0);

    //创始人的所有级别矩阵，默认全部激活，不用付费
    for (var i = 1; i <= MAX_LEVEL; i++) {
        user.activeX3Levels[i] = true;
        user.activeX6Levels[i] = true;
    }

    //将创始人加入到用户记录数组中
    UserDB.setUser(ownerAddress, user.getEncoded());

    //将创始人记录到ID记录数组中
    idToAddress.set(1, ownerAddress);

    //用户ID为1的记录为创始人
    userIds.set(1, ownerAddress);

    return Context.self();
}

// 获取合约拥有者地址
export function getOwner(): Address {
    return Globals.get<Address>('owner');
}

// 重置合约拥有者地址
export function resetOwner(ownerAddress: Address): void {
    const msg = Context.msg();
    let owner = Globals.get<Address>('owner');
    assert(msg.sender == owner, 'sender is not owner');
    let reUser = UserDB.getUser(owner);
    UserDB.removeUser(owner);
    UserDB.setUser(ownerAddress, reUser);
    idToAddress.set(1, ownerAddress);
    userIds.set(1, ownerAddress);
    Globals.set<Address>('owner', ownerAddress);
    return;
}

//新用户注册
//参数为：推荐人地址
//注意，这个方法是一个可以外部调用的方法，同时允许转账ETH,因此带有payable修饰符
//内部调用了真正处理新用户注册的registration方法
export function registrationExt(referrerAddress : Address) {
    const msg = Context.msg();
    registration(msg.sender, referrerAddress, msg.amount);
}

//购买级别
export function buyNewLevel(matrix : u64, level : u64) {
    const msg = Context.msg();
    assert(UserDB.hasUser(msg.sender), "user is not exists. Register first.");
    assert(matrix == 1 || matrix == 2, "invalid matrix");
    assert(msg.amount == levelPrice[level], "invalid price");
    assert(level > 1 && level <= MAX_LEVEL, "invalid level");

    let sendUser = UserDB.getUser(msg.sender);

    if (matrix == 1) {
        assert(!sendUser.activeX3Levels[level], "level already activated");

        if (sendUser.x3Matrix[level-1].blocked) {
            sendUser.x3Matrix[level-1].blocked = false;
        }

        let freeX3Referrer = findFreeX3Referrer(msg.sender, level);
        sendUser.x3Matrix[level].currentReferrer = freeX3Referrer;
        sendUser.activeX3Levels[level] = true;
        updateX3Referrer(msg.sender, freeX3Referrer, level);

        Context.emit<Upgrade>(new Upgrade(msg.sender, freeX3Referrer, 1, level));

    } else {
        // require(!users[msg.sender].activeX6Levels[level], "level already activated");
        //
        // if (users[msg.sender].x6Matrix[level-1].blocked) {
        //     users[msg.sender].x6Matrix[level-1].blocked = false;
        // }
        //
        // address freeX6Referrer = findFreeX6Referrer(msg.sender, level);
        //
        // users[msg.sender].activeX6Levels[level] = true;
        // updateX6Referrer(msg.sender, freeX6Referrer, level);
        //
        // emit Upgrade(msg.sender, freeX6Referrer, 2, level);
    }
}

//新用户注册方法
//参数为：新用户地址、推荐人地址
//注意，所谓的新用户注册，就是给某个已经加入到矩阵的地址（推荐人地址）投资，同时要符合级别的要求，新用户只能从第一级开始
function registration(userAddress : Address,referrerAddress : Address, amount: u256) {

    /*这里是一些前置条件的校验，条件分别为：
      1、转账的ETH必须是0.5个，为什么呢？因为必须同时激活X3与X6的第一个级别，分别是0.025，加起来就得是0.5,
         同时要注意，是不包含手续费的，也就是说得要推荐人能收到0.5个ETH
      2、新用户如果在矩阵中已经存在，就不能重复注册
      3、推荐人必须是已经在矩阵中存在的
    */
    assert(amount == firstPrice, "registration cost ${ firstPrice }");
    assert(!UserDB.hasUser(userAddress), "user exists");
    assert(UserDB.hasUser(referrerAddress), "referrer not exists");

    /*这里一段代码是计算用户地址的长度，之所以要计算，是因为要禁止合约账户参与
      在以太坊中，通过extcodesize计算出来的codesize，如果是合约地址，事务携带的payload就不会是0
      因此，这里要求必须是最普通的地址参与投资
    */
    // U256 size;
    // assembly {
    //     size := extcodesize(userAddress)
    // }
    // require(size == 0, "cannot be a contract");

    let lastUserId = Globals.get<u256>('lastUserId');
    //构造User对象
    let user = new User(lastUserId, referrerAddress,0)

    //激活X3与x6的第一个级别
    user.activeX3Levels[1] = true;
    user.activeX6Levels[1] = true;

    //新用户的推荐人地址
    user.referrer = referrerAddress;

    //保存新用户数据
    UserDB.setUser(userAddress, user);
    //用户ID->用户地址
    idToAddress.set(lastUserId, userAddress);

    //新用户记录到ID总册中，同时最新的id+1
    userIds.set(lastUserId, userAddress);
    Globals.set<u256>('lastUserId', lastUserId++);

    let referrerUser = UserDB.getUser(referrerAddress);
    //用户推荐人地址的团队总数+1
    referrerUser.partnersCount = referrerUser.partnersCount + 1;
    UserDB.setUser(referrerAddress, referrerUser);

    /*确认X3的推荐人地址
    这里要注意，不是上述的推荐人地址，而是用户所在X3矩阵的实际推荐人地址，这个地方容易产生混淆性，
    当一个用户加入进来时，总是因为某个推荐人的推荐加入的，因此用户首先会有一个直接的推荐人，
    然后，站在矩阵的角度，还会有一个矩阵实际推荐人，见如下的findFreeX3Referrer方法
    */
    let freeX3Referrer = findFreeX3Referrer(userAddress, 1);

    //将新用户的第一个X3级别的矩阵推荐人地址，赋值为freeX3Referrer
    let userx3Matrix = new X3();
    userx3Matrix.currentReferrer = freeX3Referrer;
    user.x3Matrix[1] = userx3Matrix;

    //将确认到的X3推荐人地址，填入新用户X3第一个矩阵的推荐人地址中
    //注意参数中的freeX3Referrer，这个地址如上所述，是矩阵实际推荐人
    updateX3Referrer(userAddress, freeX3Referrer, 1);

    //这里是处理X6矩阵的情况，这个方法与上述类似，先确定X6级别的实际推荐人地址，再进行更新
    // updateX6Referrer(userAddress, findFreeX6Referrer(userAddress, 1), 1);

    //发送用户注册事件
    Context.emit<Registration>(new Registration(userAddress, referrerAddress, userIds.get(userAddress), userIds.get(referrerAddress)));
}

//检查用户推荐人X3模块下某个矩阵是否激活
//参数为：传入用户地址、X3矩阵级别序列号，并获取实际推荐人地址
//最终获得的结果是：用户地址的推荐人地址（向上遍历），如果有已经激活指定级别X3矩阵的，就返回那个推荐人地址
function findFreeX3Referrer(userAddress : Address , level : u64): Address {
    //这里用一个while循环来向上遍历
    while (true) {
        //检测用户推荐人的X3矩阵是否激活，这里注意矩阵级别，也就是下面代码中的level，
        //完整的说，是检测用户推荐人的指定级别的矩阵是否激活
        if (UserDB.getUser(UserDB.getUser(userAddress).referrer).activeX3Levels[level]) {
            //如果是激活的，就返回推荐人地址
            return UserDB.getUser(userAddress).referrer;
        }

        //如果用户推荐人指定级别的X3矩阵没有激活，就将userAddress更新为用户推荐人地址，继续上述的while循环判断
        userAddress = UserDB.getUser(userAddress).referrer;
    }
}

//更新X3矩阵
//参数为：用户地址、推荐人地址（在调用时，会赋值为实际推荐人地址）、矩阵级别
function updateX3Referrer(userAddress: Address,referrerAddress: Address, level: u64): void {

    //将当前用户地址填入推荐人的X3矩阵下面
    //根据理解，填入的时候，可能处于3种位置，其中第3个位置会触发矩阵重置以及推荐人地址的复投
    let referrerAddressUser = UserDB.getUser(referrerAddress);
    referrerAddressUser.x3Matrix[level].referrals.push(userAddress);
    UserDB.setUser(referrerAddress, referrerAddressUser);

    //如果推荐人指定级别的X3矩阵的下级点位少于3个，也就是还没都点亮
    if (referrerAddressUser.x3Matrix[level].referrals.length < 3) {
        //发送新用户位置占据事件
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, 1, level, referrerAddressUser.x3Matrix[level].referrals.length));
        //还没有全部点亮，那么根据X3的规则，新用户的投入就要转发给直接推荐人，并且直接返回，终止了updateX3Referrer方法的执行
        return sendWDCDividends(referrerAddress, userAddress, 1, level);
    }

    //以下代码都是对点亮了第3个位置的处理

    //发送一个新用户占据位置到事件
    Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, 1, level, 3));

    //如果是正好占据第3个位置，则需要重置矩阵，首先清空本地址对应推荐人地址
    //如下所示，清空了referrals数组，注意用户地址与上级之间的关系是永久存在的，这里清空的只是矩阵中的占位数据
    referrerAddressUser.x3Matrix[level].referrals = [];

    //如果推荐人的之后级别的矩阵未激活并且当前矩阵不是最后一个矩阵，那么该推荐人此矩阵之后的收益取消
    if (!referrerAddressUser.activeX3Levels[level+1] && level != MAX_LEVEL) {
        /*设置推荐人对应级别的矩阵的阻塞状态为true
          在这里由于用户地址占据了第3个位置，因此导致所处矩阵重置，重置时，对应的referrerAddress地址需要判断是否还能继续接收后续的收益，
          如果referrerAddress具备已经激活的更高一级的矩阵，则仍然可以继续接收滑落的收益，
          如果当前级别已经是最高级别了，则也仍然可以继续接收滑落的收益。
          这一个步骤的处理，实际上是促使用户购买高等级的矩阵。
        */
        referrerAddressUser.x3Matrix[level].blocked = true;

        //在代码中，只有购买级别的方法中，有对blocked属性设置为false的地方，因此，一旦blocked后，就只能通过购买级别来激活了
    }

    let owner = Globals.get<Address>('owner');
    //如果实际推荐人地址不是创始人地址
    if (referrerAddress != owner) {
        //通过referrerAddress再次向上遍历查找实际推荐人地址
        //这里也就是所谓的复投，也就是寻找到用户地址是实际推荐人地址的实际推荐人地址（继续向上搜索）
        let freeReferrerAddress = findFreeX3Referrer(referrerAddress, level);

        //如果搜索到的freeReferrerAddress，与referrerAddress所处user对象中的currentReferrer不一致，则进行更新
        if (referrerAddressUser.x3Matrix[level].currentReferrer != freeReferrerAddress) {
            referrerAddressUser.x3Matrix[level].currentReferrer = freeReferrerAddress;
        }

        //用户地址的实际推荐人所处级别的矩阵的复投数量+1
        referrerAddressUser.x3Matrix[level].reinvestCount++;

        //发送复投事件
        Context.emit<Reinvest>(new Reinvest(referrerAddress, freeReferrerAddress, userAddress, 1, level));

        //由于发生了复投，所以相当于再次发生了一遍updateX3Referrer，这里是一个递归的过程
        updateX3Referrer(referrerAddress, freeReferrerAddress, level);
    } else {
        //如果实际推荐人地址是创始人地址，则用户的投入转发给创始人地址
        //注意，向上遍历时，最终如果到达创始人地址，则总是能接收
        sendWDCDividends(owner, userAddress, 1, level);
        //创始人地址对应级别的团队总数+1
        let ownerUser = UserDB.getUser(owner);
        ownerUser.x3Matrix[level].reinvestCount++;
        UserDB.setUser(owner, ownerUser);

        //发送复投事件
        Context.emit<Reinvest>(new Reinvest(owner, ZERO_ADDRESS, userAddress, 1, level));
    }
}

//发送ETH
//参数为：接收者地址、发送地址、对应X3/X6矩阵、矩阵级别
//同时可以看到这个方法是一个私有方法，也就是不允许在外部直接调用
function sendWDCDividends(userAddress: Address , _from: Address , matrix : u64 , level: u64 ): void {

    /*首先要确定ETH接收人的地址
      这里使用了一个方法findEthReceiver来进行确定
      返回值包含两个值，一个是确定的接收人地址，一个表示是否奖金滑落
    */
    let findWdcReceiver = findWdcReceiver(userAddress, _from, matrix, level);
    let receiver = findWdcReceiver.receiver;
    let isExtraDividends = findWdcReceiver.isExtraDividends;
    //使用send方法向receiver地址转账，
    receiver.transfer(levelPrice.get(level));

    //如果奖金发生了滑落，则发送一个奖金滑落事件
    if (isExtraDividends) {
        Context.emit<SentExtraEthDividends>(new SentExtraEthDividends(_from, receiver, matrix, level));
    }
}

//确定eth的接收人地址，寻找每一笔交易ETH真正的接收者，检查推荐人的对应矩阵是否阻塞
//参数：接收地址、发送地址、矩阵类型、矩阵级别
function findWdcReceiver(userAddress: Address , _from: Address , matrix: u64 , level: u64) {
    //将参数中的接收地址赋值给receiver变量
    let receiver = userAddress;
    //
    let isExtraDividends = true;

    //如果是X3矩阵
    if (matrix == 1) {

        //这里又是通过一个循环来进行寻找
        while (true) {
            //如果接收者地址对应矩阵的blocked状态是true
            if (UserDB.getUser(receiver).x3Matrix[level].blocked) {
                //发送奖金烧伤事件
                Context.emit<MissedWdcReceive>(new MissedWdcReceive(receiver, _from, 1, level));
                //将isExtraDividends的状态更新为true，表示奖金将滑落
                isExtraDividends = true;
                //将接收者地址更新为当前接收者地址所在X3矩阵，对应矩阵级别的，有效推荐人地址
                //关于currentReferrer的获得，在之前的方法中已经有过
                receiver = UserDB.getUser(receiver).x3Matrix[level].currentReferrer;
            } else {
                //返回有效的接收者地址，以及滑落状态
                return { receiver, isExtraDividends };
            }
        }
    } else {
        //如果是x6矩阵
        while (true) {
            //同样是一个循环的检索过程

            //如果接收地址对应级别的X6矩阵是blocked状态，则继续向上搜索
            if (UserDB.getUser(receiver).x6Matrix[level].blocked) {
                //发送奖金滑落事件
                Context.emit<MissedWdcReceive>(new MissedWdcReceive(receiver, _from, 2, level));
                //更新滑落状态为true
                isExtraDividends = true;
                //将接收人地址更新为currentReferrer
                receiver = UserDB.getUser(receiver).x6Matrix[level].currentReferrer;
            } else {
                //如果不是blocked状态，则返回，返回值包含有效的接收人地址以及滑落状态
                return {receiver, isExtraDividends};
            }
        }
    }
}

@unmanaged class NewUserPlace {
    constructor(readonly user: Address, readonly referrer: Address, readonly matrix: u64, readonly level: u64, readonly place: u256) { }
}

@unmanaged class MissedWdcReceive {
    constructor(readonly receiver: Address, readonly from: Address, readonly matrix: u64, readonly level: u64) { }
}

@unmanaged class SentExtraEthDividends {
    constructor(readonly from: Address, readonly receiver: Address, readonly matrix: u64, readonly level: u64) { }
}

@unmanaged class Reinvest {
    constructor(readonly user: Address, readonly currentReferrer: Address, readonly caller: Address, readonly matrix: u64, readonly level: u64) { }
}

@unmanaged class Registration {
    constructor(readonly user: Address, readonly referrer: Address, readonly userId: u256, readonly referrerId: u256) { }
}

@unmanaged class Upgrade {
    constructor(readonly user: Address, readonly referrer: Address, readonly matrix: u256, readonly level: u256) { }
}

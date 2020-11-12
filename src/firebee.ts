import { Address, DB, log, Store } from "../node_modules/keystore_wdc/lib";
import { User, MAX_LEVEL, ZERO_ADDRESS, X3, X6, userDB } from "./types";
import { ___idof, ABI_DATA_TYPE, Context, Globals, U256 } from "../node_modules/keystore_wdc/lib/index";

class FndWdcReceiverResult {
    receiver: Address;
    isExtraDividends: boolean;
    constructor() {
        this.receiver = ZERO_ADDRESS;
        this.isExtraDividends = false;
    }
}


export const idToAddress = Store.from<u64, Address>('idToAddress');
const userIds = Store.from<Address, u64>('userIds');
const levelPrice = Store.from<u64, U256>('levelPrice');
const blackPrice = Store.from<u64, U256>('blackPrice');

// 第一级的价格
const WDC = U256.fromU64(100000000);
// @ts-ignore
const firstPrice: U256 = U256.fromU64(200) * WDC;

export function init(ownerAddress: Address): Address {
    //当前最新的可用ID，由于合约部署时，创始人会使用1作为ID，因此从2开始作为当前最新可用ID
    Globals.set<u64>('lastUserId', 2);
    // ownerAddress
    //第一个等级是价格设定
    // @ts-ignore
    levelPrice.set(1, firstPrice * U256.fromU64(95) / U256.fromU64(200));
    // @ts-ignore
    blackPrice.set(1, firstPrice * U256.fromU64(5) / U256.fromU64(200));
    //每个等级的激活价格都是前一个等级的两倍
    for (let i = 2; i <= MAX_LEVEL; i++) {
        // @ts-ignore
        let nextLeverPrice = levelPrice.get(i - 1) * U256.fromU64(2);
        // @ts-ignore
        let nextBlackPrice = blackPrice.get(i - 1) * U256.fromU64(2);
        // @ts-ignore
        levelPrice.set(i, nextLeverPrice);
        // @ts-ignore
        blackPrice.set(i, nextBlackPrice);
    }
    //将合约部署人的地址赋值到owner属性
    //owner是可以提供方法修改的，相当于切换合约管理员
    Globals.set<Address>('owner', ownerAddress);

    //将创始人，也就是合约部署者的地址定义为ID为1的用户
    let user = new User(1, ownerAddress, 0);

    //创始人的所有级别矩阵，默认全部激活，不用付费
    for (let i = 1; i <= MAX_LEVEL; i++) {
        user.activeX3Levels[i] = true;
        user.activeX6Levels[i] = true;
    }
    //将创始人加入到用户记录数组中
    userDB.setUser(ownerAddress, user);

    //将创始人记录到ID记录数组中
    idToAddress.set(1, ownerAddress);

    //用户ID为1的记录为创始人
    userIds.set(ownerAddress, 1);

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
    let reUser = userDB.getUser(owner);
    userDB.removeUser(owner);
    userDB.setUser(ownerAddress, reUser);
    idToAddress.set(1, ownerAddress);
    userIds.set(ownerAddress, i64(1));
    Globals.set<Address>('owner', ownerAddress);
    return;
}

// 获取最大等级
export function getMaxLevel(): U256 {
    return U256.fromU64(MAX_LEVEL);
}

// 根据地址查看用户，零地址说明不存在
export function getUserFromAddress(addr: Address): ArrayBuffer {
    return userDB.getUser(addr).getEncoded();
}

// 根据地址查看id
export function getUserIdFromAddress(addr: Address): u64 {
    // 如果地址不存在，返回 0，防止合约执行抛出异常
    return userIds.getOrDefault(addr, 0);
}

// 根据id查看地址
export function getAddressFromUserId(id: u64): Address {
    // 如果 id 不存在，返回 0 地址，防止合约执行抛出异常
    return idToAddress.getOrDefault(id, ZERO_ADDRESS);
}

// 获取最新UserId
export function getlastUserId(): u64 {
    return Globals.get<u64>('lastUserId');
}

// 查看级数的价格
export function getPriceFromLevel(level: u64): U256 {
    return levelPrice.get(level);
}

// 查看级数黑洞的价格
export function getBlackPriceFromLevel(level: u64): U256 {
    return blackPrice.get(level);
}

//新用户注册
//参数为：推荐人地址
//注意，这个方法是一个可以外部调用的方法，同时允许转账wdc,因此带有payable修饰符
//内部调用了真正处理新用户注册的registration方法
export function registrationExt(referrerAddress: Address): u64 {
    const msg = Context.msg();
    let ret = registration(msg.sender, referrerAddress, msg.amount);
    userDB.persist();
    return ret;
}

//购买级别
export function buyNewLevel(matrix: u64, level: i64): void {
    const msg = Context.msg();
    const l = i32(level)
    assert(userDB.hasUser(msg.sender), "user is not exists. Register first.");
    assert(matrix == 1 || matrix == 2, "invalid matrix");
    // @ts-ignore
    assert(msg.amount == levelPrice.get(l) + blackPrice.get(l), "invalid price");
    assert(l > 1 && l <= MAX_LEVEL, "invalid level");

    let sendUser = userDB.getUser(msg.sender);

    if (matrix == 1) {
        assert(!sendUser.activeX3Levels[l], "level already activated");

        if (sendUser.x3Matrix[l - 1].blocked) {
            sendUser.x3Matrix[l - 1].blocked = false;
        }

        let freeX3Referrer = findFreeX3Referrer(msg.sender, l);
        sendUser.x3Matrix[l].currentReferrer = freeX3Referrer;
        sendUser.activeX3Levels[l] = true;

        updateX3Referrer(msg.sender, freeX3Referrer, l);

        Context.emit<Upgrade>(new Upgrade(msg.sender, freeX3Referrer, U256.fromU64(1), U256.fromU64(l)));

    } else {
        assert(!sendUser.activeX6Levels[l], "level already activated");

        if (sendUser.x6Matrix[l - 1].blocked) {
            sendUser.x6Matrix[l - 1].blocked = false;
        }

        let freeX6Referrer = findFreeX6Referrer(msg.sender, l);
        sendUser.x6Matrix[l].currentReferrer = freeX6Referrer;
        sendUser.activeX6Levels[l] = true;

        updateX6Referrer(msg.sender, freeX6Referrer, l);

        Context.emit<Upgrade>(new Upgrade(msg.sender, freeX6Referrer, U256.fromU64(2), U256.fromU64(l)));
    }

    userDB.persist();
}

//新用户注册方法
//参数为：新用户地址、推荐人地址
//注意，所谓的新用户注册，就是给某个已经加入到矩阵的地址（推荐人地址）投资，同时要符合级别的要求，新用户只能从第一级开始
function registration(userAddress: Address, referrerAddress: Address, amount: U256): u64 {

    /*这里是一些前置条件的校验，条件分别为：
      1、转账的wdc必须是200个，为什么呢？因为必须同时激活X3与X6的第一个级别，分别是100，加起来就得是200,
         同时要注意，是不包含手续费的，也就是说得要推荐人能收到200个wdc
      2、新用户如果在矩阵中已经存在，就不能重复注册
      3、推荐人必须是已经在矩阵中存在的
    */
    assert(amount == firstPrice, "registration cost 200");
    assert(!userDB.hasUser(userAddress), "user exists");
    assert(userDB.hasUser(referrerAddress), "referrer not exists");

    /*这里一段代码是计算用户地址的长度，之所以要计算，是因为要禁止合约账户参与
      在以太坊中，通过extcodesize计算出来的codesize，如果是合约地址，事务携带的payload就不会是0
      因此，这里要求必须是最普通的地址参与投资
    */
    // U256 size;
    // assembly {
    //     size := extcodesize(userAddress)
    // }
    // require(size == 0, "cannot be a contract");

    let lastUserId = Globals.get<u64>('lastUserId');
    //构造User对象
    let user = new User(lastUserId, referrerAddress, 0)
    // 刚创建的用户先要保存
    userDB.setUser(userAddress, user);

    //激活X3与x6的第一个级别
    user.activeX3Levels[1] = true;
    user.activeX6Levels[1] = true;

    //新用户的推荐人地址
    user.referrer = referrerAddress;
    //用户ID->用户地址
    idToAddress.set(lastUserId, userAddress);
    //新用户记录到ID总册中，同时最新的id+1
    userIds.set(userAddress, lastUserId);
    Globals.set<u64>('lastUserId', lastUserId + 1);
    let referrerUser = userDB.getUser(referrerAddress);
    //用户推荐人地址的团队总数+1
    referrerUser.partnersCount = referrerUser.partnersCount + 1;



    /*确认X3的推荐人地址
    这里要注意，不是上述的推荐人地址，而是用户所在X3矩阵的实际推荐人地址，这个地方容易产生混淆性，
    当一个用户加入进来时，总是因为某个推荐人的推荐加入的，因此用户首先会有一个直接的推荐人，
    然后，站在矩阵的角度，还会有一个矩阵实际推荐人，见如下的findFreeX3Referrer方法
    */
    let freeX3Referrer = findFreeX3Referrer(userAddress, 1);
    //将新用户的第一个X3级别的矩阵推荐人地址，赋值为freeX3Referrer
    user.x3Matrix[1].currentReferrer = freeX3Referrer;

    let freeX6Referrer = findFreeX6Referrer(userAddress, 1);
    //将新用户的第一个X6级别的矩阵推荐人地址，赋值为freeX6Referrer
    user.x6Matrix[1].currentReferrer = freeX6Referrer;



    //将确认到的X3推荐人地址，填入新用户X3第一个矩阵的推荐人地址中
    //注意参数中的freeX3Referrer，这个地址如上所述，是矩阵实际推荐人
    updateX3Referrer(userAddress, freeX3Referrer, 1);
    //这里是处理X6矩阵的情况，这个方法与上述类似，先确定X6级别的实际推荐人地址，再进行更新
    updateX6Referrer(userAddress, freeX6Referrer, 1);

    //发送用户注册事件
    Context.emit<Registration>(new Registration(
        userAddress, referrerAddress,
        U256.fromU64(userIds.get(userAddress)),
        U256.fromU64(userIds.get(referrerAddress)))
    );

    return user.id;
}

//检查用户推荐人X3模块下某个矩阵是否激活
//参数为：传入用户地址、X3矩阵级别序列号，并获取实际推荐人地址
//最终获得的结果是：用户地址的推荐人地址（向上遍历），如果有已经激活指定级别X3矩阵的，就返回那个推荐人地址
function findFreeX3Referrer(userAddress: Address, level: i64): Address {
    //这里用一个while循环来向上遍历
    while (true) {
        //检测用户推荐人的X3矩阵是否激活，这里注意矩阵级别，也就是下面代码中的level，
        //完整的说，是检测用户推荐人的指定级别的矩阵是否激活
        assert(userDB.hasUser(userAddress), 'user exists');
        const u = userDB.getUser(userAddress)
        assert(userDB.hasUser(u.referrer), 'referrer exists');
        const r = userDB.getUser(u.referrer)
        if (r.activeX3Levels[i32(level)]) {
            //如果是激活的，就返回推荐人地址
            return u.referrer;
        }

        //如果用户推荐人指定级别的X3矩阵没有激活，就将userAddress更新为用户推荐人地址，继续上述的while循环判断
        userAddress = u.referrer
    }
}

//更新X3矩阵
//参数为：用户地址、推荐人地址（在调用时，会赋值为实际推荐人地址）、矩阵级别
function updateX3Referrer(userAddress: Address, referrerAddress: Address, level: i64): void {

    //将当前用户地址填入推荐人的X3矩阵下面
    //根据理解，填入的时候，可能处于3种位置，其中第3个位置会触发矩阵重置以及推荐人地址的复投
    let referrerAddressUser = userDB.getUser(referrerAddress);
    referrerAddressUser.x3Matrix[i32(level)].referrals.push(userAddress);

    //如果推荐人指定级别的X3矩阵的下级点位少于3个，也就是还没都点亮
    if (referrerAddressUser.x3Matrix[i32(level)].referrals.length < 3) {
        //发送新用户位置占据事件
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, U256.fromU64(1), U256.fromU64(level), U256.fromU64(referrerAddressUser.x3Matrix[i32(level)].referrals.length)));
        //还没有全部点亮，那么根据X3的规则，新用户的投入就要转发给直接推荐人，并且直接返回，终止了updateX3Referrer方法的执行
        sendWDCDividends(referrerAddress, userAddress, 1, level);
        return;
    }

    //以下代码都是对点亮了第3个位置的处理

    //发送一个新用户占据位置到事件
    Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, U256.fromU64(1), U256.fromU64(level), U256.fromU64(3)));

    //如果是正好占据第3个位置，则需要重置矩阵，首先清空本地址对应推荐人地址
    //如下所示，清空了referrals数组，注意用户地址与上级之间的关系是永久存在的，这里清空的只是矩阵中的占位数据
    referrerAddressUser.x3Matrix[i32(level)].referrals = [];

    //如果推荐人的之后级别的矩阵未激活并且当前矩阵不是最后一个矩阵，那么该推荐人此矩阵之后的收益取消
    if (!referrerAddressUser.activeX3Levels[i32(level + 1)] && level != MAX_LEVEL) {
        /*设置推荐人对应级别的矩阵的阻塞状态为true
          在这里由于用户地址占据了第3个位置，因此导致所处矩阵重置，重置时，对应的referrerAddress地址需要判断是否还能继续接收后续的收益，
          如果referrerAddress具备已经激活的更高一级的矩阵，则仍然可以继续接收滑落的收益，
          如果当前级别已经是最高级别了，则也仍然可以继续接收滑落的收益。
          这一个步骤的处理，实际上是促使用户购买高等级的矩阵。
        */
        referrerAddressUser.x3Matrix[i32(level)].blocked = true;
        //在代码中，只有购买级别的方法中，有对blocked属性设置为false的地方，因此，一旦blocked后，就只能通过购买级别来激活了
    }

    let owner = Globals.get<Address>('owner');
    //如果实际推荐人地址不是创始人地址
    if (referrerAddress != owner) {
        //通过referrerAddress再次向上遍历查找实际推荐人地址
        //这里也就是所谓的复投，也就是寻找到用户地址是实际推荐人地址的实际推荐人地址（继续向上搜索）
        let freeReferrerAddress = findFreeX3Referrer(referrerAddress, level);

        //如果搜索到的freeReferrerAddress，与referrerAddress所处user对象中的currentReferrer不一致，则进行更新
        if (referrerAddressUser.x3Matrix[i32(level)].currentReferrer != freeReferrerAddress) {
            referrerAddressUser.x3Matrix[i32(level)].currentReferrer = freeReferrerAddress;
        }

        //用户地址的实际推荐人所处级别的矩阵的复投数量+1
        referrerAddressUser.x3Matrix[i32(level)].reinvestCount++;

        //发送复投事件
        Context.emit<Reinvest>(new Reinvest(referrerAddress, freeReferrerAddress, userAddress, U256.fromU64(1), U256.fromU64(level)));

        //由于发生了复投，所以相当于再次发生了一遍updateX3Referrer，这里是一个递归的过程
        updateX3Referrer(referrerAddress, freeReferrerAddress, level);
    } else {
        //如果实际推荐人地址是创始人地址，则用户的投入转发给创始人地址
        //注意，向上遍历时，最终如果到达创始人地址，则总是能接收
        sendWDCDividends(owner, userAddress, 1, level);
        //创始人地址对应级别的团队总数+1
        let ownerUser = userDB.getUser(owner);
        ownerUser.x3Matrix[i32(level)].reinvestCount++;

        //发送复投事件
        Context.emit<Reinvest>(new Reinvest(owner, ZERO_ADDRESS, userAddress, U256.fromU64(1), U256.fromU64(level)));
    }
}

//发送wdc
//参数为：接收者地址、发送地址、对应X3/X6矩阵、矩阵级别
//同时可以看到这个方法是一个私有方法，也就是不允许在外部直接调用
function sendWDCDividends(userAddress: Address, _from: Address, matrix: u64, level: i64): void {

    /*首先要确定wdc接收人的地址
      这里使用了一个方法findWdcReceiver来进行确定
      返回值包含两个值，一个是确定的接收人地址，一个表示是否奖金滑落
    */
    let wdcReceiver = findWdcReceiver(userAddress, _from, matrix, level);
    let receiver: Address = wdcReceiver.receiver;
    let isExtraDividends = wdcReceiver.isExtraDividends;
    //使用send方法向receiver地址转账，
    receiver.transfer(levelPrice.get(u32(level)));
    ZERO_ADDRESS.transfer(blackPrice.get(u32(level)));
    //如果奖金发生了滑落，则发送一个奖金滑落事件
    if (isExtraDividends) {
        Context.emit<SentExtraWdcDividends>(new SentExtraWdcDividends(_from, receiver, U256.fromU64(matrix), U256.fromU64(level)));
    }
}

//确定wdc的接收人地址，寻找每一笔交易WDC真正的接收者，检查推荐人的对应矩阵是否阻塞
//参数：接收地址、发送地址、矩阵类型、矩阵级别
function findWdcReceiver(userAddress: Address, _from: Address, matrix: u64, level: i64): FndWdcReceiverResult {
    //将参数中的接收地址赋值给receiver变量
    let receiver = userAddress;
    //
    let isExtraDividends: boolean = true;

    let result = new FndWdcReceiverResult();

    //如果是X3矩阵
    if (matrix == 1) {

        //这里又是通过一个循环来进行寻找
        while (true) {
            //如果接收者地址对应矩阵的blocked状态是true
            if (userDB.getUser(receiver).x3Matrix[i32(level)].blocked) {
                //发送奖金烧伤事件
                Context.emit<MissedWdcReceive>(new MissedWdcReceive(receiver, _from, U256.fromU64(1), U256.fromU64(level)));
                //将isExtraDividends的状态更新为true，表示奖金将滑落
                isExtraDividends = true;
                //将接收者地址更新为当前接收者地址所在X3矩阵，对应矩阵级别的，有效推荐人地址
                //关于currentReferrer的获得，在之前的方法中已经有过
                receiver = userDB.getUser(receiver).x3Matrix[i32(level)].currentReferrer;
            } else {
                result.receiver = receiver;
                result.isExtraDividends = isExtraDividends;
                //返回有效的接收者地址，以及滑落状态
                return result;
            }
        }
    } else {
        //如果是x6矩阵
        while (true) {
            //同样是一个循环的检索过程

            //如果接收地址对应级别的X6矩阵是blocked状态，则继续向上搜索
            if (userDB.getUser(receiver).x6Matrix[i32(level)].blocked) {
                //发送奖金滑落事件
                Context.emit<MissedWdcReceive>(new MissedWdcReceive(receiver, _from, U256.fromU64(2), U256.fromU64(level)));
                //更新滑落状态为true
                isExtraDividends = true;
                //将接收人地址更新为currentReferrer
                receiver = userDB.getUser(receiver).x6Matrix[i32(level)].currentReferrer;
            } else {
                result.receiver = receiver;
                result.isExtraDividends = isExtraDividends;
                //如果不是blocked状态，则返回，返回值包含有效的接收人地址以及滑落状态
                return result;
            }
        }
    }
}

/*更新X6矩阵
      参数为：传入用户地址、实际推荐人地址、对应矩阵等级
      注意，实际调用这个方法时，参数中的referrerAddress是向上遍历时确定的实际有效推荐人
      这也是一个私有方法，表明不能在合约外部直接调用
    */
function updateX6Referrer(userAddress: Address, referrerAddress: Address, level: i64): void {

    //有效推荐人地址的对应X6级别需要是激活状态
    let referrerAddressUser = userDB.getUser(referrerAddress);
    let userAddressUser = userDB.getUser(userAddress);
    let owner = Globals.get<Address>('owner');
    assert(referrerAddressUser.activeX6Levels[i32(level)], "500. Referrer level is inactive");

    //x6矩阵结构中包含两行子级，一个是firstLevelReferrals，有两个地址；一个是secondLevelReferrals，有4个地址

    //如果推荐人地址的firstLevelReferrals不足两个
    if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals.length < 2) {
        //将用户地址填充到推荐人地址的firstLevelReferrals中
        referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals.push(userAddress);
        //发送用户地址占位的事件：用户地址、推荐人地址、X6模块、对应矩阵等级、放在第一层级的哪个位置
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, U256.fromU64(2), U256.fromU64(level), U256.fromU64(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals.length)));

        //用户地址对应级别的x6矩阵，其currentReferrer更新为referrerAddress
        userAddressUser.x6Matrix[i32(level)].currentReferrer = referrerAddress;

        //进行转账处理
        //如果推荐人地址就是创始人地址，则直接进行转账
        if (referrerAddress == owner) {
            sendWDCDividends(referrerAddress, userAddress, 2, level);
            return;
        }

        //以下为推荐人地址不是创始人地址的处理

        /*取出有效推荐人地址对应级别矩阵的有效推荐人地址，也就是所谓的隔代处理
          注意，隔代的说法其实并不严格准确，因为得是符合指定级别矩阵的有效的上级推荐人，并不一定是通常所认为的隔一代
          为了便于说明，将这种推荐人的推荐人地址，称之为二级推荐人地址
        */
        let ref = referrerAddressUser.x6Matrix[i32(level)].currentReferrer;
        let refUser = userDB.getUser(ref);
        /*确定的隔代的上级有效推荐人地址，在其对应的secondLevelReferrals加入用户地址
          这里要注意，在上面的代码中，用户地址填充进了推荐人地址的第一层级的位置，这里又加入了二级推荐人，看起来似乎加入了两个不同的层级，
          其实不是的，当一个用户注册后，其实只是表明加入了这个users，并不存在一个通常意义的层级（虽然从图表来看，在那一瞬间，是有一个层级存在的，但是很快就会消失）
          因此，所谓的关系，其实都是逻辑上的，用户注册时的投入，会根据规则决定接收者地址
          而当一个用户地址注册进来时，在不同的视角会从属于不同的属性
          比如在这里，一级推荐人的子级中增加了用户地址，则同时二级推荐人的第二级子级也是加入了用户地址的
        */
        refUser.x6Matrix[i32(level)].secondLevelReferrals.push(userAddress);

        //获得二级推荐人的第一层级的已有点位数量
        let len = refUser.x6Matrix[i32(level)].firstLevelReferrals.length;

        /*由于x6是隔代处理的，因此以下的代码，是以二级推荐人为视角进行的处理
          需要注意，当一个用户地址注册到X6矩阵时，由于x6矩阵的结构比X3要复杂，用户地址可有多个位置可以占据，因此需要判断
          这是需要特别注意的地方，对于X6来说，每个地址底下有6个位置可选
        */

        //如果二级推荐人第一层级点位已满，并且两个点位都是推荐人的地址
        if ((len == 2) &&
            (refUser.x6Matrix[i32(level)].firstLevelReferrals[0] == referrerAddress) &&
            (refUser.x6Matrix[i32(level)].firstLevelReferrals[1] == referrerAddress)) {

            if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals.length == 1) {
                //如果推荐人的第一层级只有一个点位，发送占位事件
                //事件参数为：用户地址、二级推荐人、X6模块、对应矩阵等级、第5位置
                Context.emit<NewUserPlace>(new NewUserPlace(userAddress, ref, U256.fromU64(2), U256.fromU64(level), U256.fromU64(5)));
            } else {
                //
                Context.emit<NewUserPlace>(new NewUserPlace(userAddress, ref, U256.fromU64(2), U256.fromU64(level), U256.fromU64(6)));
            }
        } else if ((len == 1 || len == 2) &&
            refUser.x6Matrix[i32(level)].firstLevelReferrals[0] == referrerAddress) {
            //如果二级推荐人的第一层级已满或者只占据了一个位置，并且第一层级的第一位是推荐人地址

            //如果推荐人地址的第一个层级只占据了一位
            if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals.length == 1) {
                Context.emit<NewUserPlace>(new NewUserPlace(userAddress, ref, U256.fromU64(2), U256.fromU64(level), U256.fromU64(3)));
            } else {
                Context.emit<NewUserPlace>(new NewUserPlace(userAddress, ref, U256.fromU64(2), U256.fromU64(level), U256.fromU64(4)));
            }
        } else if (len == 2 && refUser.x6Matrix[i32(level)].firstLevelReferrals[1] == referrerAddress) {
            //如果二级推荐人第一层级点位已满，并且第一层级的第二位是推荐人地址

            if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals.length == 1) {
                Context.emit<NewUserPlace>(new NewUserPlace(userAddress, ref, U256.fromU64(2), U256.fromU64(level), U256.fromU64(5)));
            } else {
                Context.emit<NewUserPlace>(new NewUserPlace(userAddress, ref, U256.fromU64(2), U256.fromU64(level), U256.fromU64(6)));
            }
        }

        log('17');
        updateX6ReferrerSecondLevel(userAddress, ref, level);
        log('18');
        return;
    }

    referrerAddressUser.x6Matrix[i32(level)].secondLevelReferrals.push(userAddress);

    if (referrerAddressUser.x6Matrix[i32(level)].closedPart != ZERO_ADDRESS) {
        if ((referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0] ==
            referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1]) &&
            (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0] ==
                referrerAddressUser.x6Matrix[i32(level)].closedPart)) {

            updateX6(userAddress, referrerAddress, level, true);
            updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
            return;
        } else if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0] ==
            referrerAddressUser.x6Matrix[i32(level)].closedPart) {
            updateX6(userAddress, referrerAddress, level, true);
            updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
            return;
        } else {
            updateX6(userAddress, referrerAddress, level, false);
            updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
            return;
        }
    }

    if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1] == userAddress) {
        updateX6(userAddress, referrerAddress, level, false);
        updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
        return;
    } else if (referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0] == userAddress) {
        updateX6(userAddress, referrerAddress, level, true);
        updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
        return;
    }

    if (userDB.getUser(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0]).x6Matrix[i32(level)].firstLevelReferrals.length <=
        userDB.getUser(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1]).x6Matrix[i32(level)].firstLevelReferrals.length) {
        updateX6(userAddress, referrerAddress, level, false);
    } else {
        updateX6(userAddress, referrerAddress, level, true);
    }

    updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
}

function updateX6ReferrerSecondLevel(userAddress: Address, referrerAddress: Address, level: i64): void {

    let referrerAddressUser = userDB.getUser(referrerAddress);
    let referrerAddressRefUser = userDB.getUser(referrerAddressUser.x6Matrix[i32(level)].currentReferrer);
    let owner = Globals.get<Address>('owner');

    if (referrerAddressUser.x6Matrix[i32(level)].secondLevelReferrals.length < 4) {
        sendWDCDividends(referrerAddress, userAddress, 2, level);
        return;
    }

    let x6 = referrerAddressRefUser.x6Matrix[i32(level)].firstLevelReferrals;

    if (x6.length == 2) {
        if (x6[0] == referrerAddress || x6[1] == referrerAddress) {
            referrerAddressRefUser.x6Matrix[i32(level)].closedPart = referrerAddress;
        } else if (x6.length == 1) {
            if (x6[0] == referrerAddress) {
                referrerAddressRefUser.x6Matrix[i32(level)].closedPart = referrerAddress;
            }
        }
    }

    referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals = [];
    referrerAddressUser.x6Matrix[i32(level)].secondLevelReferrals = [];
    referrerAddressUser.x6Matrix[i32(level)].closedPart = ZERO_ADDRESS;

    if (!referrerAddressUser.activeX6Levels[i32(level + 1)] && level != MAX_LEVEL) {
        referrerAddressUser.x6Matrix[i32(level)].blocked = true;
    }

    referrerAddressUser.x6Matrix[i32(level)].reinvestCount++;

    log('16');
    // userDB.setUser(referrerAddress, referrerAddressUser);
    // userDB.setUser(referrerAddressUser.x6Matrix[i32(level)].currentReferrer, referrerAddressRefUser);

    if (referrerAddress != owner) {
        let freeReferrerAddress = findFreeX6Referrer(referrerAddress, level);

        Context.emit<Reinvest>(new Reinvest(referrerAddress, freeReferrerAddress, userAddress, U256.fromU64(2), U256.fromU64(level)));
        updateX6Referrer(referrerAddress, freeReferrerAddress, level);
    } else {
        Context.emit<Reinvest>(new Reinvest(owner, ZERO_ADDRESS, userAddress, U256.fromU64(2), U256.fromU64(level)));
        sendWDCDividends(owner, userAddress, 2, level);
    }
}

//检查用户推荐人X6模块下某个矩阵是否激活
//参数为：传入用户地址、X3矩阵级别序列号，并获取实际推荐人地址
//处理逻辑与上述的X3类似
function findFreeX6Referrer(userAddress: Address, level: i64): Address {
    while (true) {
        if (userDB.getUser(userDB.getUser(userAddress).referrer).activeX6Levels[i32(level)]) {
            return userDB.getUser(userAddress).referrer;
        }

        userAddress = userDB.getUser(userAddress).referrer;
    }
}

function updateX6(userAddress: Address, referrerAddress: Address, level: i64, x2: bool): void {
    let userAddressUser = userDB.getUser(userAddress);
    let referrerAddressUser = userDB.getUser(referrerAddress);
    let referrerAddressRefUser = userDB.getUser(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0]);
    let referrerAddressRefUserO = userDB.getUser(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1]);
    if (!x2) {
        referrerAddressRefUser.x6Matrix[i32(level)].firstLevelReferrals.push(userAddress);
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0], U256.fromU64(2), U256.fromU64(level), U256.fromU64(referrerAddressRefUser.x6Matrix[i32(level)].firstLevelReferrals.length)));
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, U256.fromU64(2), U256.fromU64(level), U256.fromU64(2 + referrerAddressRefUser.x6Matrix[i32(level)].firstLevelReferrals.length)));
        //set current level
        userAddressUser.x6Matrix[i32(level)].currentReferrer = referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0];
    } else {
        referrerAddressRefUserO.x6Matrix[i32(level)].firstLevelReferrals.push(userAddress);
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1], U256.fromU64(2), U256.fromU64(level), U256.fromU64(referrerAddressRefUserO.x6Matrix[i32(level)].firstLevelReferrals.length)));
        Context.emit<NewUserPlace>(new NewUserPlace(userAddress, referrerAddress, U256.fromU64(2), U256.fromU64(level), U256.fromU64(4 + referrerAddressRefUserO.x6Matrix[i32(level)].firstLevelReferrals.length)));
        //set current level
        userAddressUser.x6Matrix[i32(level)].currentReferrer = referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1];
    }
    // userDB.setUser(userAddress, userAddressUser);
    // userDB.setUser(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[0], referrerAddressRefUser);
    // userDB.setUser(referrerAddressUser.x6Matrix[i32(level)].firstLevelReferrals[1], referrerAddressRefUserO);
}

// 所有合约的主文件必须声明此函数
export function __idof(type: ABI_DATA_TYPE): u32 {
    return ___idof(type);
}

@unmanaged class NewUserPlace {
    constructor(readonly user: Address, readonly referrer: Address, readonly matrix: U256, readonly level: U256, readonly place: U256) { }
}

@unmanaged class MissedWdcReceive {
    constructor(readonly receiver: Address, readonly from: Address, readonly matrix: U256, readonly level: U256) { }
}

@unmanaged class SentExtraWdcDividends {
    constructor(readonly from: Address, readonly receiver: Address, readonly matrix: U256, readonly level: U256) { }
}

@unmanaged class Reinvest {
    constructor(readonly user: Address, readonly currentReferrer: Address, readonly caller: Address, readonly matrix: U256, readonly level: U256) { }
}

@unmanaged class Registration {
    constructor(readonly user: Address, readonly referrer: Address, readonly userId: U256, readonly referrerId: U256) { }
}

@unmanaged class Upgrade {
    constructor(readonly user: Address, readonly referrer: Address, readonly matrix: U256, readonly level: U256) { }
}

import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_HOST,
  TAG_TEXT,
  PLACEMENT,
} from './constants';
import { setProps } from './utils';

let nextUnitOfWork = null; //下一个工作单元
let workInProgressRoot = null; //RootFiber应用的根: 容器节点container

/**
 * 从根节点开始渲染和调度
 * 两个阶段（diff+render阶段，commit阶段）
 *
 * diff+render阶段 对比新旧虚拟DOM，进行增量更新或创建
 * 花时间长，可进行任务拆分，此阶段可暂停
 * 拆分的维度: 虚拟dom
 *
 * render阶段的成果是effect list知道哪些节点更新哪些节点增加删除了
 * render阶段两个任务
 *   1.根据虚拟DOM生成fiber树
 *   2.收集effectlist
 *
 * commit阶段，进行DOM更新创建阶段，此间断不能暂停,要一气呵成，否则页面会表现为卡顿效果
 * @param {tag:TAG_ROOT,stateNode:container,props:{children:[element]} rootFiber
 *
 * 在源码里头，这些都有单独的包
 * reconciler
 * schedule
 */
// [无误]
export function scheduleRoot(rootFiber) {
  // 保证起点都是一样的
  workInProgressRoot = rootFiber;
  nextUnitOfWork = rootFiber;
}

// [无误]
function performUnitOfWork(currentFiber) {
  beginWork(currentFiber);

  if (currentFiber.child) {
    return currentFiber.child; //有孩子返回孩子
  }
   
  while (currentFiber) {
    // 没有儿子，让自己完成
    completeUnitOfWork(currentFiber);
    // 看看有没有弟弟
    if (currentFiber.sibling) {
      return currentFiber.sibling; //有弟弟返回弟弟
    }

    // 无孩子且无弟弟，则返回父亲，并让父亲完成 (深度遍历的回溯操作)
    currentFiber = currentFiber.return; //返回父辈 (叔叔或者父亲)
  }
}

/**
 * 难点函数: 
 * 查看图解 /src/statics/fibereffectlistwithchild3.jpg -> 结果得到一个链条
 * 查看图解 /src/statics/fibereffectlistabc.png
 * 查看图解[搜毒优先搜索] /src/statics/completeUnitOfWork.jpg
 * 深度优先搜索规则(后续遍历)
 * 儿子为子节点、弟弟为兄弟节点
 * -> 流程操作: 当遍历到自己的时候，不是立马完成自己. 而是需要先判断儿子，弟弟。他们完成之后，回溯到自己时，再完成自己
 * 
 * 在完成时收集副作用 组成effect list
 * 每个fiber有两个属性 
 * firstEffect指向第一个有副作用的子fiber
 * lastEffect指向最后一个有副作用的子fiber，
 * 中间用nextEffect做成单链表
 * @param {*} currentFiber
 * 
 */
// [无误]
function completeUnitOfWork(currentFiber) { // 第一个完成的 A1(TEXT)
  let returnFiber = currentFiber.return; // A1 当前fiber

  if (returnFiber) {
    // 这一段是把自己儿子的effect链挂到父亲身上
    // 当子树中的所有儿子节点都遍历过并且完成的转换，那么如何回溯? 并且与子树中顶级父节点与 其父节点如何关联起来? 看这些代码操作
    if (!returnFiber.firstEffect) {
      // 当前节点的父节点的第一个节点(firstEffect) 指向 当前节点的第一个子节点(firstEffect)
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (!!currentFiber.lastEffect) {
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      } 
      // 当前节点的父节点的最后一个节点(firstEffect) 指向 当前节点的最后一个子节点(firstEffect)
      returnFiber.lastEffect = currentFiber.lastEffect;
    }

    // 这一段是把自己的effect链挂到父亲身上
    const effectTag = currentFiber.effectTag;
    if (effectTag) {// 出过钱的节点
      //如果有副作用，（第一次时肯定有，新增默认PLACEMENT）

      /* 每个fiber有两个属性 
       * firstEffect指向第一个有副作用的子fiber
       * lastEffect指向最后一个有副作用的子fiber，
       * 中间用nextEffect做成单链表
       * 
       * 因此 A1 first last = A1(Text)
       */
      if (returnFiber.lastEffect) { // 当父节点不止一个子节点时，此时父节点的lastEffect指向 应该指向最后一个儿子。 这是为了回溯的时候可以找到当前节点的父节点(还没有完成自己的变更: fiber -> 真实dom)
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
}

/**
 * beginWork开始遍历每一个节点
 *
 * 1.创建真实DOM元素
 * 2.创建子fiber
 * @param {*} currentFiber
 */
//[无误]
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) { // 原声dom节点
    updateHost(currentFiber);
  }
}

/**
 * 在虚拟dom中的原生dom节点处理操作
 * @param {*} currentFiber 
 */
// [无误]
function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    //如果此fiber没有, 则创建DOM节点
    currentFiber.stateNode = createDom(currentFiber);
  }
  // 子节点也得继续处理(内部递归处理子子节点)
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}



// fiber -> 真实的dom元素 
// [无误]
function createDom(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  } else if (currentFiber.tag === TAG_HOST) {// span div
    let stateNode = document.createElement(currentFiber.type);// div
    // 更新真实dom元素的属性
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

/**
 * 
 * @param {*} stateNode 老的dom节点
 * @param {*} oldProps 老的dom节点属性
 * @param {*} newProps 新的dom节点属性
 * 
 */
// [无误]
function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

//[无误]
function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    //如果此fiber没有创建DOM节点，则新创建dom
    currentFiber.stateNode = createDom(currentFiber);
  }
}

//[无误]
function updateHostRoot(currentFiber) {
  //先处理自己 如果是一个原生节点，创建真实DOM 2.创建子fiber
  let newChildren = currentFiber.props.children; //[element=<div id="A1"]
  reconcileChildren(currentFiber, newChildren); //reconcile协调
}

// TODO 有错误
function reconcileChildren(currentFiber, newChildren) {// [A1]
  let newChildIndex = 0; //新子节点的索引
  let prevSibiling; //上一个新的子fiber
 
  //遍历我们子虚拟DOM元素数组，为每一个虚拟DOM创建子Fiber
  while (newChildIndex < newChildren.length) {
    let newChild = newChildren[newChildIndex]; //取出虚拟DOM节点 [A1]{type: 'A1}
    let tag;
    if (newChild && newChild.type == ELEMENT_TEXT) { // TODO 文本字符串没有挂载上
      tag = TAG_TEXT; // 这是一个文本节点
    } else if (newChild && typeof newChild.type === 'string') {
      tag = TAG_HOST; //如果type是字符串，那么这是一个原生DOM节点div 'A1'
    } else {
      console.log('tag:------')
    }
    // 虚拟dom -> fiber
    let newFiber = {
      tag,// TAG_HOST
      type: newChild.type,// div
      props: newChild.props,// {id="A1" style={style}}
      stateNode: null, //div还没有创建DOM元素
      return: currentFiber, //父Fiber returnFiber
      effectTag: PLACEMENT, //副作用标示，render会收集副作用 增加 删除 更新 // 有此字段的节点的 表示出了钱的
      nextEffect: null, //effect list也是一个单链表 
      // effect list 顺序 和完成顺序一样 但是节点只放在那些出钱的fiber节点，不出钱的节点则绕过去 (减少不必要的渲染)
    };

    // 最小的儿子没有弟弟的 -> 没有.sibling
    if (newFiber) {
      if (newChildIndex == 0) {
        currentFiber.child = newFiber; //如果索引是0，就是大儿子
      } else {
        prevSibiling.sibling = newFiber; //大儿子指向小一点的弟弟
      }
      prevSibiling = newFiber;
    }
    newChildIndex++;
  }
}

/**
 * 回调返回浏览器空闲时间，判断是否继续执行任务
 * @param {*} deadline
 * 
 */
// [无误]
function workLoop(deadline) {
  let shouldYield = false; //react是否要让出时间片 或说控制权
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 执行完一个任务后
    shouldYield = deadline.timeRemaining() < 1; // 没有时间了的话，就要让出控制权的
  }
  // 如果时间片到期后还有任务没有完成，就需要请求浏览器在此调度
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }

  /*
   *  不管有没有任务，都请求在此调度
   *  即每一帧都要执行一次 workLoop
   *  react告诉 浏览器，我现在有任务 请你在空闲的时候执行
   *  TODO 难点: 这里有一个优先级的概念. expirationTime
   */
  requestIdleCallback(workLoop, { timeout: 500 });
}

// 挂载到真实dom之后再提交到页面
//[无误]
function commitRoot() {
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    console.log('commitRoot:', currentFiber.type, currentFiber.props.text);
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  workInProgressRoot = null;
}

//[无误]
function commitWork(currentFiber) {
  if(!currentFiber) return;
  
  let returnFiber = currentFiber.return;
  let returnDOM = returnFiber.stateNode;

  if(currentFiber.effectTag === PLACEMENT){
    returnDOM.appendChild(currentFiber.stateNode);
  }

  currentFiber.effectTag = null;
}

//[无误]
//react询问浏览器是否空闲,这里有个优先级的概念 expirationTime
window.requestIdleCallback(workLoop, { timeout: 500 });



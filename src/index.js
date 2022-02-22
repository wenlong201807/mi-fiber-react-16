import React from './react';
// import React from 'react';
import ReactDOM from 'react-dom';

// jsx 其实是一种特殊语法，在webpack打包的时候，会通过babel转化为react.createElement 对象
let element = (
  <div id="A1">
    <div id="B1">
      <div id="C1"></div>
      <div id="C2"></div>
    </div>
    <div id="B2"></div>
  </div>
);

/* 
React.createElement(type, props, ...children);
虚拟dom: 一个js对象，以js对象的方式描述洁面上dom的样子。

let element = React.createElement("div", {
  id: "A1"
}, React.createElement("div", {
  id: "B1"
}, React.createElement("div", {
  id: "C1"
}), React.createElement("div", {
  id: "C2"
})), React.createElement("div", {
  id: "B2"
}));


*/
console.log('element:', element);
// ReactDOM.render(element, document.getElementById('root'));

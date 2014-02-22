# Tpler

嵌入式的Javascript模板引擎


## Installation
	
	$ npm install tpler

## Features

  * 静态缓存解析后的 JavaScript
  * 使用 `<%  code %>` 实现 JavaScript 代码嵌套
  * 使用 `<%= code %>` 打印变量并转义变量值中的 html
  * 使用 `<%- code %>` 打印却不转义变量值中的 html
  * 使用 `<%@ name %>` 实现模板之间的嵌套
  * 使用 `<%~ html %>` 实现 html 插值法打印，将转义 html
  * 使用 `<%# html %>` 实现 html 插值法打印，不转义 html
  * 客户端支持
  * 使用 `-%>` 实现换行符号插入，比如：`<% var hello = 'Hello, tpler' -%>`

## Example

    <% if (user) { %>
	    <h2><%= user.name %></h2>
    <% } %>

## Usage

    tpler.compile(str, options);
    // => Function

    tpler.render(str, options);
    // => str

## Options

  - `cache`           缓存编译后的函数，需要 `filename` 支持
  - `filename`        作用于缓存和模板嵌套
  - `scope`           函数执行上下文
  - `debug`           调试模式
  - `open`            开始标签，默认为 `<%`
  - `close`           标签，默认为 `%>`
  - `locals`          模板的本地变量集
  - `*`               其他的为模板的本地变量

## Includes

 模板之间的嵌套仅仅是一种声明，并非 JavaScript 代码，声明嵌套的模板名称是根据字面意思解析得到的，比如 `<% include user/show %>` 表示嵌套模板 `user/show` 或 `user/show.tpler`。

	<ul>
	  <% users.forEach(function(user){ %>
	    <% include user/show %>
	  <% }) %>
	</ul>

## Interpolate

  利用标记 `<%~ html %>` 或 `<%# html %>` 配合标记 `#{variable|state}`实现简单而实用的字符串插值法

	<%~ <a name='#{link.name}' class='link["class"]'>#{line.content}</a> %>
	// => &lt;a name='sjz' class='sjz'&gt;转义插值法&lt;/a&gt;

	<%# <a name='#{link.name}' class='link["class"]'>#{line.content}</a> %>
	// => <a name='sjz' class='sjz'>不转义插值法</a>;

## Custom delimiters

  此外可以全局应用自定义分隔符：

    var tpler = require('tpler');
    tpler.open = '{{';
    tpler.close = '}}';

  这将使下面的模板有效:

    <h1>{{= title }}</h1>

## Layouts

  利用 Tpler 的模板嵌套功能，实施"布局"，比如只包括页眉和页脚：

	<%@ head %>
	<h1>Title</h1>
	<p>My page</p>
	<%@ foot %>

## License 

  (The MIT License)
	
	Copyright(c) 2014 Maofeng Zhang <japplet@163.com>
	
	Permission is hereby granted, free of charge, to any person obtaining
	a copy of this software and associated documentation files (the
	'Software'), to deal in the Software without restriction, including
	without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to
	permit persons to whom the Software is furnished to do so, subject to
	the following conditions:
	
	The above copyright notice and this permission notice shall be
	included in all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
	CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
	TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
	SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

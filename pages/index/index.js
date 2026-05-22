// index.js - 待办清单首页逻辑
// 作者：期末大作业
// 功能概述：
//   - 从本地存储读取并渲染待办任务列表
//   - 支持新增、完成状态切换、删除任务
//   - 动态统计已完成/未完成数量，并展示进度条与激励文案

Page({

  /**
   * 页面的初始数据（所有绑定到视图的变量均在此声明）
   *
   * todos:            全量待办任务数组，每条数据格式为：
   *                   { id: Number, content: String, completed: Boolean, createTime: String }
   * todoCount:        未完成任务数量（用于分组标题角标）
   * doneCount:        已完成任务数量（用于分组标题角标）
   * isEmpty:          是否没有任何任务（控制空状态 UI 显示）
   * hasTodo:          是否存在未完成任务（控制"待完成"分组显示）
   * hasDone:          是否存在已完成任务（控制"已完成"分组显示）
   * currentDate:      当前日期字符串（onLoad 时动态计算）
   * inputValue:       输入框双向绑定值
   * completedPercent: 完成进度百分比（0~100），用于驱动进度条宽度
   * motivationText:   根据完成进度动态生成的激励文案
   */
  data: {
    todos:            [],      // 全量任务列表
    todoCount:        0,       // 未完成数量
    doneCount:        0,       // 已完成数量
    isEmpty:          true,    // 是否为空状态
    hasTodo:          false,   // 是否有未完成任务
    hasDone:          false,   // 是否有已完成任务
    currentDate:      '',      // 当前日期字符串
    inputValue:       '',      // 输入框当前值
    completedPercent: 0,       // 完成进度（百分比整数）
    motivationText:   '',      // 动态激励文案
  },

  /**
   * 生命周期函数 - 页面加载时触发（整个生命周期只触发一次）
   * 负责：计算当日日期字符串 + 初次读取本地存储数据
   */
  onLoad() {
    // 获取当前日期并格式化为中文字符串（如：2026年5月22日）
    const now = new Date();
    const currentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    this.setData({ currentDate });

    // 读取本地存储中的任务数据，初始化列表
    this.loadTodos();
  },

  /**
   * 生命周期函数 - 页面每次显示时触发（从后台切换回来也会触发）
   * 保证用户每次看到页面时，数据都是最新的
   */
  onShow() {
    this.loadTodos();
  },

  /**
   * 核心数据加载方法：从本地存储读取任务列表，计算所有统计指标，一次性更新视图
   *
   * 统计逻辑：
   *   completedPercent = Math.round(doneCount / totalCount * 100)
   *   motivationText   = 根据 completedPercent 区间选取对应激励文案
   *
   * 设计原则：所有派生数据（统计量、进度、文案）均在此方法中集中计算，
   * 避免在其他方法中重复计算，保持单一数据源。
   */
  loadTodos() {
    // 同步读取本地存储，键名固定为 'todos'；首次运行时为空，默认给空数组
    const todos = wx.getStorageSync('todos') || [];

    // 分别统计未完成与已完成的任务数量
    const todoCount = todos.filter(item => !item.completed).length;
    const doneCount = todos.filter(item =>  item.completed).length;
    const total     = todos.length;

    // 计算完成进度百分比（无任务时设为 0，避免除以 0 的异常）
    const completedPercent = total > 0 ? Math.round(doneCount / total * 100) : 0;

    // 根据完成进度选取动态激励文案，激励用户保持行动力
    let motivationText = '';
    if (total === 0) {
      motivationText = '添加你的第一个任务吧 🌱';
    } else if (completedPercent === 0) {
      motivationText = `今日共 ${total} 项任务，加油！💪`;
    } else if (completedPercent < 50) {
      motivationText = `已完成 ${doneCount} 项，继续保持！🔥`;
    } else if (completedPercent < 100) {
      motivationText = `超过一半了！还剩 ${todoCount} 项 ⚡`;
    } else {
      // 全部完成时展示庆祝文案
      motivationText = '太棒了！今日任务全部完成 🎉';
    }

    // 一次性将所有派生数据写入 data，减少渲染次数，提升性能
    this.setData({
      todos,
      todoCount,
      doneCount,
      completedPercent,
      motivationText,
      isEmpty:  total === 0,      // 无任何任务 → 显示空状态
      hasTodo:  todoCount > 0,    // 有未完成任务 → 显示"待完成"分组
      hasDone:  doneCount  > 0,   // 有已完成任务 → 显示"已完成"分组
    });
  },

  /**
   * 输入框内容实时变化事件处理器
   * 每当用户输入/删除一个字符，将最新输入值同步到 data.inputValue
   * @param {Object} e - 事件对象，e.detail.value 为输入框当前完整文本
   */
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value,
    });
  },

  /**
   * 新增待办任务
   * 触发方式：点击"+"按钮 或 键盘"完成"键（bindconfirm）
   *
   * 执行流程：
   *   1. 对输入内容 trim() 后进行非空校验
   *   2. 构造新任务对象（id 使用 Date.getTime() 时间戳保证唯一性）
   *   3. 将新任务 unshift 到数组头部（最新任务排在最上面）
   *   4. wx.setStorageSync 持久化保存到本地
   *   5. 调用 loadTodos() 刷新视图与统计数据
   *   6. 清空输入框，弹出成功 Toast
   */
  addTodo() {
    // trim() 去掉首尾空格，防止用户只输入空格的无效任务
    const content = this.data.inputValue.trim();

    // 内容为空则给出友好提示并终止执行
    if (!content) {
      wx.showToast({
        title: '请输入待办内容',
        icon: 'none',
        duration: 1500,
      });
      return;
    }

    // 获取当前时间，用于生成唯一 id 和创建时间标签
    const now = new Date();
    const hours   = String(now.getHours()).padStart(2, '0');    // 补零：如 9 → '09'
    const minutes = String(now.getMinutes()).padStart(2, '0');  // 补零：如 5 → '05'

    // 构造符合数据规范的新任务对象
    const newTodo = {
      id:         now.getTime(),             // 毫秒级时间戳，全局唯一
      content:    content,                   // 去除空格后的任务内容
      completed:  false,                     // 新任务默认为未完成状态
      createTime: `今天 ${hours}:${minutes}`, // 创建时间，展示在任务卡片副标题
    };

    // 将新任务插入数组最前面（保持最新任务在顶部的展示逻辑）
    const todos = [newTodo, ...this.data.todos];

    // 持久化写入本地存储，确保下次打开应用数据不丢失
    wx.setStorageSync('todos', todos);

    // 复用 loadTodos 统一刷新视图（包含进度、文案等所有派生数据）
    this.loadTodos();

    // 清空输入框，为下次输入做准备
    this.setData({ inputValue: '' });

    // 弹出带对勾图标的成功提示，给用户明确的操作反馈
    wx.showToast({
      title: '添加成功！',
      icon: 'success',
      duration: 1200,
    });
  },

  /**
   * 切换待办事项的完成状态（已完成 ↔ 未完成）
   * 触发方式：点击任务卡片左侧的圆形复选框
   *
   * 执行流程：
   *   1. 通过 e.currentTarget.dataset.id 获取目标任务的 id
   *   2. 使用 Array.map 遍历数组，找到目标任务后取反 completed 字段
   *   3. 其余任务对象保持不变（浅拷贝，不污染原数据）
   *   4. 持久化保存 + 刷新视图 + 轻震动触觉反馈
   *
   * @param {Object} e - 事件对象，e.currentTarget.dataset.id 为目标任务 id
   */
  toggleTodo(e) {
    // 从 WXML 的 data-id 属性中取出任务 id
    const id = e.currentTarget.dataset.id;

    // Array.map 生成新数组：仅修改目标任务的 completed 字段，其余不变
    const todos = this.data.todos.map(item => {
      if (item.id === id) {
        // 使用扩展运算符浅拷贝对象，避免直接修改原数据引用
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    // 持久化保存更新后的数组
    wx.setStorageSync('todos', todos);

    // 刷新视图（进度条、文案、分组计数均会联动更新）
    this.loadTodos();

    // 轻震动触觉反馈，让"打勾"操作更有仪式感
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 删除指定待办事项
   * 触发方式：点击任务卡片右侧的垃圾桶图标
   *
   * 执行流程：
   *   1. 通过 e.currentTarget.dataset.id 获取目标任务的 id
   *   2. 弹出二次确认 Modal（红色确认按钮），防止用户误删
   *   3. 用户点击"删除"确认后：Array.filter 过滤掉目标 id
   *   4. 持久化保存 + 刷新视图 + 中等震动反馈 + Toast 提示
   *
   * @param {Object} e - 事件对象，e.currentTarget.dataset.id 为目标任务 id
   */
  deleteTodo(e) {
    // 从 WXML 的 data-id 属性中取出目标任务 id
    const id = e.currentTarget.dataset.id;

    // 弹出系统级确认弹框，二次确认防止误删
    wx.showModal({
      title:       '删除任务',
      content:     '确认删除此待办事项？',
      confirmText: '删除',
      confirmColor: '#FF4D4F',   // 红色确认按钮，强调危险操作
      cancelText:  '取消',
      success: (res) => {
        if (res.confirm) {
          // 用 filter 生成不含目标 id 的新数组，不直接改变原数组
          const todos = this.data.todos.filter(item => item.id !== id);

          // 持久化保存到本地存储
          wx.setStorageSync('todos', todos);

          // 刷新视图（若删除后列表为空，将自动显示空状态 UI）
          this.loadTodos();

          // 中等强度震动，区别于状态切换的轻震动，给用户不同的触觉感知
          wx.vibrateShort({ type: 'medium' });

          // 给出简短的删除成功提示
          wx.showToast({
            title:    '已删除',
            icon:     'none',
            duration: 1000,
          });
        }
        // 用户点击"取消"则不做任何操作，弹框自动关闭
      },
    });
  },

})

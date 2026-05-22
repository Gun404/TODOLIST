// index.js - 待办清单首页逻辑
// Step 2：实现生命周期函数与本地存储数据读取

Page({

  /**
   * 页面的初始数据
   * todos: 全量待办任务数组，每条数据格式为：
   *   { id: Number, content: String, completed: Boolean, createTime: String }
   * todoCount:    未完成任务数量（用于列表分组标题角标）
   * doneCount:    已完成任务数量（用于列表分组标题角标）
   * isEmpty:      是否没有任何任务（控制空状态 UI 的显示）
   * hasTodo:      是否存在未完成任务（控制"待完成"分组的显示）
   * hasDone:      是否存在已完成任务（控制"已完成"分组的显示）
   */
  data: {
    todos: [],        // 全量任务列表
    todoCount: 0,     // 未完成数量
    doneCount: 0,     // 已完成数量
    isEmpty: true,    // 是否为空状态
    hasTodo: false,   // 是否有未完成任务
    hasDone: false,   // 是否有已完成任务
    currentDate: '',  // 当前日期字符串，onLoad 时动态计算
    inputValue: '',   // 输入框双向绑定值（Step 3 使用）
  },

  /**
   * 生命周期函数 - 页面加载时触发（只触发一次）
   * 首次进入页面时，计算当前日期字符串并读取任务数据
   */
  onLoad() {
    // 计算并显示今日日期（格式：XXXX年X月X日）
    const now = new Date();
    const currentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    this.setData({ currentDate });

    this.loadTodos();
  },

  /**
   * 生命周期函数 - 页面显示时触发（每次切换回本页面都会触发）
   * 保证从其他页面返回时数据始终最新
   */
  onShow() {
    this.loadTodos();
  },

  /**
   * 从本地存储读取待办数据，并更新页面状态
   * 使用 wx.getStorageSync 同步读取，键名固定为 'todos'
   * 读取后同步计算各项统计指标，一次性 setData 减少渲染次数
   */
  loadTodos() {
    // 从本地存储读取数据，若无数据则默认为空数组
    const todos = wx.getStorageSync('todos') || [];

    // 按完成状态分别统计数量
    const todoCount = todos.filter(item => !item.completed).length;
    const doneCount  = todos.filter(item =>  item.completed).length;

    // 更新页面数据，驱动视图渲染
    this.setData({
      todos,
      todoCount,
      doneCount,
      isEmpty:  todos.length === 0,   // 无任何任务 → 显示空状态
      hasTodo:  todoCount > 0,        // 有未完成任务 → 显示"待完成"分组
      hasDone:  doneCount  > 0,       // 有已完成任务 → 显示"已完成"分组
    });
  },

  /**
   * 输入框内容变化事件处理器
   * 每当用户输入一个字符，实时将输入值同步到 data.inputValue
   * @param {Object} e - 事件对象，e.detail.value 为输入框当前值
   */
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value,
    });
  },

  /**
   * 新增待办任务
   * 触发方式：点击"+"按钮 或 键盘回车（bindconfirm）
   * 执行流程：
   *   1. 校验输入内容不能为空
   *   2. 构造新任务对象（id 使用当前时间戳保证唯一性）
   *   3. 将新任务插入数组头部（最新的在最上面）
   *   4. 持久化保存到本地存储
   *   5. 刷新页面统计数据
   *   6. 清空输入框 + 弹出成功 Toast
   */
  addTodo() {
    // 去除首尾空格后进行非空校验
    const content = this.data.inputValue.trim();
    if (!content) {
      // 输入为空时轻提示，不做任何操作
      wx.showToast({
        title: '请输入待办内容',
        icon: 'none',
        duration: 1500,
      });
      return;
    }

    // 构造新任务对象
    const now = new Date();
    // 格式化创建时间：今天 HH:MM
    const hours   = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const newTodo = {
      id:          now.getTime(),    // 时间戳作为唯一 id
      content:     content,          // 用户输入的任务内容
      completed:   false,            // 新任务默认未完成
      createTime:  `今天 ${hours}:${minutes}`, // 创建时间标签
    };

    // 从 data 中取出当前列表，并将新任务插入数组最前面
    const todos = [newTodo, ...this.data.todos];

    // 持久化保存到本地存储
    wx.setStorageSync('todos', todos);

    // 刷新页面数据（复用 loadTodos 的统计逻辑，保持单一数据源）
    this.loadTodos();

    // 清空输入框
    this.setData({ inputValue: '' });

    // 弹出成功提示（使用 success 图标增强反馈感）
    wx.showToast({
      title: '添加成功！',
      icon: 'success',
      duration: 1200,
    });
  },

})

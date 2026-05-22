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

})

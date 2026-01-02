/**
 * 悬浮球管理器
 * 负责悬浮球的拖拽、展开/收起、位置保存等功能
 */
class FloatingBallManager {
  constructor() {
    this.ballElement = null;
    this.triggerElement = null;
    this.panelElement = null;
    this.closeBtn = null;
    this.isExpanded = false;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.ballStartX = 0;
    this.ballStartY = 0;
    
    // 初始化
    this.init();
  }
  
  async init() {
    // 创建悬浮球DOM
    this.createFloatingBall();
    
    // 恢复位置
    await this.restorePosition();
    
    // 绑定事件
    this.bindEvents();
    
    console.log('[FloatingBall] 悬浮球已初始化');
  }
  
  createFloatingBall() {
    // 直接内嵌HTML，避免fetch问题
    const html = `
    <div id="signup-floating-ball" class="signup-floating-ball">
      <!-- 悬浮球按钮 -->
      <div class="floating-ball-trigger">
        🚀
      </div>
      
      <!-- 展开的面板 -->
      <div class="floating-panel-content">
        <div class="floating-panel-header">
          <h1>🚀 注册助手</h1>
          <button class="panel-close-btn">✕</button>
        </div>
        
        <div class="panel-body">
          <div class="status">
            <div id="floating-status-indicator" class="indicator idle">●</div>
            <span id="floating-status-text">就绪</span>
            <button id="floating-brain-btn" class="brain-trigger-btn" title="打开超级智能大脑">🧠</button>
          </div>
          
          <!-- 进度条 -->
          <div class="progress-container hidden">
            <div class="progress-bar-wrapper">
              <div id="floating-progress-bar" class="progress-bar"></div>
            </div>
            <div id="floating-progress-text" class="progress-text">0%</div>
          </div>
          
          <div class="controls">
            <div class="control-row">
              <button id="floating-start-btn" class="btn btn-primary">开始注册</button>
              <button id="floating-stop-btn" class="btn btn-danger hidden">停止监听</button>
            </div>
            <div class="control-row">
              <button id="floating-reset-btn" class="btn btn-warning">重新开始</button>
              <button id="floating-accounts-btn" class="btn btn-secondary">查看账号</button>
            </div>
            <div class="control-row">
              <button id="floating-stats-btn" class="btn btn-secondary">📊 查看统计</button>
            </div>
          </div>
          
          <div id="floating-current-account" class="account-info hidden">
            <h3>当前账号</h3>
            <div class="field">
              <label>邮箱:</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="floating-account-email" style="flex: 1; word-break: break-all;"></span>
                <button id="floating-copy-email-btn" class="btn-copy" title="复制邮箱">📋</button>
              </div>
            </div>
            <div class="field">
              <label>密码:</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="floating-account-password" style="flex: 1; word-break: break-all;"></span>
                <button id="floating-copy-password-btn" class="btn-copy" title="复制密码">📋</button>
              </div>
            </div>
            <div class="field">
              <label>用户名:</label>
              <span id="floating-account-username"></span>
            </div>
            <div class="field">
              <label>会话:</label>
              <span id="floating-account-session" style="font-family: 'Courier New', monospace; opacity: 0.9;"></span>
            </div>
          </div>
          
          <div id="floating-logs" class="logs"></div>
        </div>
      </div>
    </div>

    <!-- 超级智能大脑面板容器 -->
    <div id="floating-brain-container"></div>
    `;
    
    // 创建容器并插入HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    
    // 将所有子元素添加到body
    while (container.firstElementChild) {
      document.body.appendChild(container.firstElementChild);
    }
    
    // 获取元素引用
    this.ballElement = document.getElementById('signup-floating-ball');
    this.triggerElement = this.ballElement.querySelector('.floating-ball-trigger');
    this.panelElement = this.ballElement.querySelector('.floating-panel-content');
    this.closeBtn = this.ballElement.querySelector('.panel-close-btn');
  }
  
  async restorePosition() {
    try {
      const result = await chrome.storage.local.get(['floatingBallPosition']);
      if (result.floatingBallPosition) {
        const { right, bottom } = result.floatingBallPosition;
        this.triggerElement.style.right = right + 'px';
        this.triggerElement.style.bottom = bottom + 'px';
        this.panelElement.style.right = right + 'px';
        this.panelElement.style.bottom = bottom + 'px';
      }
    } catch (error) {
      console.error('[FloatingBall] 恢复位置失败:', error);
    }
  }
  
  async savePosition() {
    const right = parseInt(this.triggerElement.style.right) || 20;
    const bottom = parseInt(this.triggerElement.style.bottom) || 80;
    
    try {
      await chrome.storage.local.set({
        floatingBallPosition: { right, bottom }
      });
    } catch (error) {
      console.error('[FloatingBall] 保存位置失败:', error);
    }
  }
  
  bindEvents() {
    // 拖拽事件
    this.triggerElement.addEventListener('mousedown', this.onDragStart.bind(this));
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
    
    // 点击展开/收起（需要区分拖拽）
    this.triggerElement.addEventListener('click', (e) => {
      if (!this.isDragging) {
        this.toggle();
      }
    });
    
    // 关闭按钮
    this.closeBtn.addEventListener('click', () => {
      this.collapse();
    });
    
    // 点击面板外部关闭
    document.addEventListener('click', (e) => {
      if (this.isExpanded && 
          !this.panelElement.contains(e.target) && 
          !this.triggerElement.contains(e.target)) {
        this.collapse();
      }
    });
  }
  
  onDragStart(e) {
    e.preventDefault();
    this.isDragging = false; // 初始时不算拖拽，避免误触
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.ballStartX = parseInt(this.triggerElement.style.right) || 20;
    this.ballStartY = parseInt(this.triggerElement.style.bottom) || 80;
    this.triggerElement.style.cursor = 'grabbing';
  }
  
  onDrag(e) {
    if (this.dragStartX === 0 && this.dragStartY === 0) return;
    
    // 判断是否移动了足够的距离才算拖拽
    const moveX = Math.abs(e.clientX - this.dragStartX);
    const moveY = Math.abs(e.clientY - this.dragStartY);
    
    if (moveX > 5 || moveY > 5) {
      this.isDragging = true;
      this.triggerElement.classList.add('dragging');
    }
    
    if (!this.isDragging) return;
    
    const deltaX = this.dragStartX - e.clientX;
    const deltaY = e.clientY - this.dragStartY;
    
    let newRight = this.ballStartX + deltaX;
    let newBottom = this.ballStartY + deltaY;
    
    // 限制在窗口范围内
    const maxRight = window.innerWidth - 60;
    const maxBottom = window.innerHeight - 60;
    
    newRight = Math.max(0, Math.min(newRight, maxRight));
    newBottom = Math.max(0, Math.min(newBottom, maxBottom));
    
    this.triggerElement.style.right = newRight + 'px';
    this.triggerElement.style.bottom = newBottom + 'px';
    
    // 同步更新面板位置
    if (this.isExpanded) {
      this.panelElement.style.right = newRight + 'px';
      this.panelElement.style.bottom = newBottom + 'px';
    }
  }
  
  onDragEnd(e) {
    if (this.dragStartX === 0 && this.dragStartY === 0) return;
    
    if (this.isDragging) {
      this.savePosition();
    }
    
    // 延迟重置拖拽状态，避免立即触发click事件
    setTimeout(() => {
      this.isDragging = false;
      this.triggerElement.classList.remove('dragging');
      this.triggerElement.style.cursor = 'move';
    }, 100);
    
    this.dragStartX = 0;
    this.dragStartY = 0;
  }
  
  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }
  
  expand() {
    this.isExpanded = true;
    this.panelElement.classList.add('active');
    
    // 同步面板位置到悬浮球
    const right = parseInt(this.triggerElement.style.right) || 20;
    const bottom = parseInt(this.triggerElement.style.bottom) || 80;
    this.panelElement.style.right = right + 'px';
    this.panelElement.style.bottom = bottom + 'px';
    
    console.log('[FloatingBall] 面板已展开');
  }
  
  collapse() {
    this.isExpanded = false;
    this.panelElement.classList.remove('active');
    console.log('[FloatingBall] 面板已收起');
  }
  
  // 获取日志容器（供外部使用）
  getLogsContainer() {
    return this.ballElement.querySelector('#floating-logs');
  }
  
  // 获取状态指示器（供外部使用）
  getStatusIndicator() {
    return this.ballElement.querySelector('#floating-status-indicator');
  }
  
  // 获取状态文本（供外部使用）
  getStatusText() {
    return this.ballElement.querySelector('#floating-status-text');
  }
}

// 初始化悬浮球
let floatingBallManager = null;

async function initFloatingBall() {
  floatingBallManager = new FloatingBallManager();
  window.floatingBallManager = floatingBallManager;
  
  // 等待悬浮球DOM创建完成后，初始化floating-panel-core.js
  // 使用setTimeout确保DOM已经插入
  setTimeout(async () => {
    if (typeof window.initFloatingPanel === 'function') {
      await window.initFloatingPanel();
      console.log('[FloatingBall] floating-panel-core已初始化');
    } else {
      console.error('[FloatingBall] initFloatingPanel函数未找到');
    }
  }, 100);
}

// 等待DOM加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingBall);
} else {
  initFloatingBall();
}

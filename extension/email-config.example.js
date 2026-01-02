/**
 * 邮箱配置文件模板
 * 
 * 使用说明：
 * 1. 复制此文件为 email-config.js
 * 2. 根据您的需求选择邮箱模式
 * 3. 填写对应模式的配置信息
 */

// ==================== 选择模式 ====================
// 'temp-mail': 临时邮箱模式（无需配置，开箱即用）
// 'qq-imap': QQ邮箱模式（需要配置域名和邮箱）

const EMAIL_MODE = 'temp-mail';  // 修改这里选择模式

// ==================== 临时邮箱配置 ====================
const TEMP_MAIL_CONFIG = {
  // 临时邮箱服务商（已通过测试验证）
  // ✅ 可用服务：
  //   'mail-tm': Mail.tm (推荐 - 已验证可用，API完善，稳定可靠)
  //   'maildrop': MailDrop (推荐 - 已验证可用，无需注册，简单快速)
  // ⚠️ 其他服务（未测试或不可用）：
  //   '1secmail': 1SecMail
  //   'guerrilla-mail': Guerrilla Mail
  //   'tempail': Tempail.com (已失效)
  provider: 'mail-tm',  // 使用 Mail.tm（推荐）
  
  // 轮询间隔（毫秒）
  pollInterval: 5000,  // 5秒检查一次
  
  // 最大尝试次数
  maxAttempts: 60  // 5分钟超时
};

// ==================== QQ邮箱配置 ====================
const QQ_IMAP_CONFIG = {
  // 您的域名（需要配置 Cloudflare Email Routing）
  domain: 'example.com',  // 修改为您的域名
  
  // 邮箱前缀
  emailPrefix: 'windsurf',  // 生成的邮箱格式：windsurf-xxxxx@example.com
  
  // 后端API地址（需要部署后端服务）
  apiBaseUrl: 'https://your-api.vercel.app',  // 修改为您的API地址
  
  // API密钥（如果设置了的话）
  apiKey: '',  // 可选，如果后端设置了API_SECRET_KEY
  
  // 轮询间隔（毫秒）
  pollInterval: 5000,  // 5秒检查一次
  
  // 超时时间（毫秒）
  timeout: 120000  // 2分钟超时
};

// ==================== 导出配置 ====================
const EMAIL_CONFIG = {
  mode: EMAIL_MODE,
  tempMail: TEMP_MAIL_CONFIG,
  qqImap: QQ_IMAP_CONFIG,
  
  // 兼容旧版本：顶层配置（根据选择的模式自动填充）
  get prefix() {
    return this.mode === 'temp-mail' ? 'windsurf' : this.qqImap.emailPrefix;
  },
  get domain() {
    return this.mode === 'temp-mail' ? 'tempr.email' : this.qqImap.domain;
  }
};

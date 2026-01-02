/**
 * 临时邮箱客户端
 * 
 * 默认支持的服务商（仅作推荐）：
 *   - temp-mail.org
 *   - guerrillamail.com
 * 
 * 用户可以自行添加其他临时邮箱服务API：
 *   - 10分钟邮箱 (10minutemail.com)
 *   - 2925邮箱 (mail.2925.com)
 *   - TempMail+ (tempmail.plus)
 *   - 等等...
 * 
 * 添加方法：
 *   1. 参考现有的 generateXXX() 和 checkXXX() 方法
 *   2. 添加新的服务商实现
 *   3. 在 generateEmail() 和 checkMails() 中添加case
 */

class TempMailClient {
  constructor(config = {}) {
    this.provider = config.provider || 'temp-mail-org';
    this.pollInterval = config.pollInterval || 5000;
    this.maxAttempts = config.maxAttempts || 60;
    this.currentEmail = null;
    this.currentToken = null;
  }

  /**
   * 生成临时邮箱地址
   */
  async generateEmail() {
    try {
      // 根据配置选择邮箱服务商
      switch (this.provider) {
        case 'mail-tm':
          return await this.generateMailTm();
        case 'maildrop':
          return await this.generateMailDrop();
        case '1secmail':
          return await this.generate1SecMail();
        case 'guerrilla-mail':
          return await this.generateGuerrillaMail();
        case 'tempail':
          return await this.generateTempail();
        case 'temp-mail-org':
          // 旧方法已废弃，回退到mail-tm
          console.warn('[TempMail] temp-mail-org已废弃，使用mail-tm代替');
          return await this.generateMailTm();
        default:
          throw new Error(`不支持的服务商: ${this.provider}`);
      }
    } catch (error) {
      console.error('[TempMail] 生成邮箱失败:', error);
      throw error;
    }
  }

  /**
   * 1SecMail - 生成邮箱（推荐）
   * 官方API: https://www.1secmail.com/api/
   */
  async generate1SecMail() {
    try {
      console.log('[1SecMail] 正在生成邮箱...');
      const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
      
      console.log('[1SecMail] API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`1SecMail API返回错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[1SecMail] API返回数据:', data);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('1SecMail API返回数据格式错误');
      }
      
      this.currentEmail = data[0]; // 返回格式: ["abc123@1secmail.com"]
      
      // 分割邮箱获取 login 和 domain
      const [login, domain] = this.currentEmail.split('@');
      this.currentToken = JSON.stringify({ login, domain });
      
      console.log('[1SecMail] ✅ 邮箱生成成功:', this.currentEmail);
      
      return {
        email: this.currentEmail,
        token: this.currentToken
      };
    } catch (error) {
      console.error('[1SecMail] 生成邮箱失败:', error);
      console.error('[1SecMail] 错误详情:', error.message);
      throw new Error(`无法生成 1SecMail 邮箱: ${error.message}`);
    }
  }

  /**
   * Guerrilla Mail - 生成邮箱
   */
  async generateGuerrillaMail() {
    const response = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
    
    if (!response.ok) {
      throw new Error('无法生成 Guerrilla Mail 邮箱');
    }
    
    const data = await response.json();
    this.currentEmail = data.email_addr;
    this.currentToken = data.sid_token;
    
    return {
      email: this.currentEmail,
      token: this.currentToken
    };
  }

  /**
   * Mail.tm - 生成邮箱（✅ 已验证可用）
   * 官方API: https://docs.mail.tm/
   */
  async generateMailTm() {
    try {
      console.log('[Mail.tm] 正在生成邮箱...');
      
      // 1. 获取可用域名
      const domainResponse = await fetch('https://api.mail.tm/domains');
      if (!domainResponse.ok) {
        throw new Error('无法获取域名列表');
      }
      
      const domains = await domainResponse.json();
      if (!domains['hydra:member'] || domains['hydra:member'].length === 0) {
        throw new Error('没有可用域名');
      }
      
      const domain = domains['hydra:member'][0].domain;
      console.log('[Mail.tm] 使用域名:', domain);
      
      // 2. 生成完全随机的账号（不使用windsurf前缀）
      const username = Math.random().toString(36).substring(2, 15); // 完全随机13位
      const password = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const email = `${username}@${domain}`;
      
      console.log('[Mail.tm] 生成随机用户名:', username, '(无固定前缀)');
      
      // 3. 注册账号
      console.log('[Mail.tm] 注册账号:', email);
      const registerResponse = await fetch('https://api.mail.tm/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password: password })
      });
      
      if (!registerResponse.ok) {
        const error = await registerResponse.text();
        throw new Error(`注册失败: ${registerResponse.status} - ${error}`);
      }
      
      // 4. 登录获取token
      console.log('[Mail.tm] 登录获取token...');
      const loginResponse = await fetch('https://api.mail.tm/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password: password })
      });
      
      if (!loginResponse.ok) {
        throw new Error('登录失败');
      }
      
      const loginData = await loginResponse.json();
      this.currentEmail = email;
      this.currentToken = loginData.token;
      
      console.log('[Mail.tm] ✅ 邮箱生成成功:', this.currentEmail);
      
      return {
        email: this.currentEmail,
        token: this.currentToken
      };
    } catch (error) {
      console.error('[Mail.tm] 生成邮箱失败:', error);
      throw new Error(`无法生成 Mail.tm 邮箱: ${error.message}`);
    }
  }

  /**
   * MailDrop - 生成邮箱（✅ 已验证可用）
   * 官网: https://maildrop.cc
   * 特点: 无需注册，直接使用
   */
  async generateMailDrop() {
    try {
      console.log('[MailDrop] 正在生成邮箱...');
      
      // MailDrop 不需要API注册，直接生成邮箱地址即可使用
      // 使用完全随机的用户名（不使用windsurf前缀）
      const username = Math.random().toString(36).substring(2, 15); // 完全随机13位
      const email = `${username}@maildrop.cc`;
      
      console.log('[MailDrop] 生成随机用户名:', username, '(无固定前缀)');
      
      this.currentEmail = email;
      this.currentToken = username; // 使用username作为token
      
      console.log('[MailDrop] ✅ 邮箱生成成功:', this.currentEmail);
      
      return {
        email: this.currentEmail,
        token: this.currentToken
      };
    } catch (error) {
      console.error('[MailDrop] 生成邮箱失败:', error);
      throw new Error(`无法生成 MailDrop 邮箱: ${error.message}`);
    }
  }

  /**
   * Tempail - 生成邮箱（推荐：快速、稳定）
   * API: https://tempail.com/
   */
  async generateTempail() {
    try {
      console.log('[Tempail] 正在生成邮箱...');
      
      // Tempail API: 生成随机邮箱
      const response = await fetch('https://api.tempail.com/api/v1/inbox/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[Tempail] API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Tempail API返回错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Tempail] API返回数据:', data);
      
      if (!data || !data.email) {
        throw new Error('Tempail API返回数据格式错误');
      }
      
      this.currentEmail = data.email;
      this.currentToken = data.token || data.email; // 保存token或email作为标识
      
      console.log('[Tempail] ✅ 邮箱生成成功:', this.currentEmail);
      
      return {
        email: this.currentEmail,
        token: this.currentToken
      };
    } catch (error) {
      console.error('[Tempail] 生成邮箱失败:', error);
      console.error('[Tempail] 错误详情:', error.message);
      throw new Error(`无法生成 Tempail 邮箱: ${error.message}`);
    }
  }

  /**
   * 检查邮件
   */
  async checkMails() {
    if (!this.currentEmail || !this.currentToken) {
      throw new Error('请先生成邮箱地址');
    }

    try {
      switch (this.provider) {
        case 'mail-tm':
          return await this.checkMailTm();
        case 'maildrop':
          return await this.checkMailDrop();
        case '1secmail':
          return await this.check1SecMail();
        case 'guerrilla-mail':
          return await this.checkGuerrillaMail();
        case 'tempail':
          return await this.checkTempail();
        case 'temp-mail-org':
          // 旧方法已废弃，回退到mail-tm
          return await this.checkMailTm();
        default:
          return [];
      }
    } catch (error) {
      console.error('[TempMail] 检查邮件失败:', error);
      return [];
    }
  }

  /**
   * 1SecMail - 检查邮件
   */
  async check1SecMail() {
    if (!this.currentToken) {
      return [];
    }
    
    const { login, domain } = JSON.parse(this.currentToken);
    const response = await fetch(
      `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const messages = await response.json();
    return Array.isArray(messages) ? messages : [];
  }

  /**
   * Guerrilla Mail - 检查邮件
   */
  async checkGuerrillaMail() {
    console.log('[Guerrilla] 检查邮件...');
    console.log('[Guerrilla] 邮箱:', this.currentEmail);
    console.log('[Guerrilla] Token:', this.currentToken);
    
    const url = `https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${this.currentToken}`;
    console.log('[Guerrilla] API请求:', url);
    
    const response = await fetch(url);
    
    console.log('[Guerrilla] API响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('[Guerrilla] API请求失败');
      return [];
    }
    
    const data = await response.json();
    console.log('[Guerrilla] API返回数据:', JSON.stringify(data, null, 2));
    console.log('[Guerrilla] 邮件数量:', data.list ? data.list.length : 0);
    
    return data.list || [];
  }

  /**
   * Mail.tm - 检查邮件
   */
  async checkMailTm() {
    try {
      console.log('[Mail.tm] 检查邮件...');
      
      const response = await fetch('https://api.mail.tm/messages', {
        headers: {
          'Authorization': `Bearer ${this.currentToken}`
        }
      });
      
      if (!response.ok) {
        console.error('[Mail.tm] API请求失败:', response.status);
        return [];
      }
      
      const data = await response.json();
      const messages = data['hydra:member'] || [];
      
      console.log('[Mail.tm] 收到', messages.length, '封邮件');
      return messages;
    } catch (error) {
      console.error('[Mail.tm] 检查邮件失败:', error);
      return [];
    }
  }

  /**
   * MailDrop - 检查邮件
   */
  async checkMailDrop() {
    try {
      console.log('[MailDrop] 检查邮件...');
      
      // MailDrop使用简单的API
      const response = await fetch(`https://maildrop.cc/api/inbox/${this.currentToken}`);
      
      if (!response.ok) {
        console.error('[MailDrop] API请求失败:', response.status);
        return [];
      }
      
      const messages = await response.json();
      console.log('[MailDrop] 收到', messages.length, '封邮件');
      
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error('[MailDrop] 检查邮件失败:', error);
      return [];
    }
  }

  /**
   * Tempail - 检查邮件
   */
  async checkTempail() {
    console.log('[Tempail] 检查邮件...');
    console.log('[Tempail] 邮箱:', this.currentEmail);
    
    try {
      // 从邮箱地址提取inbox ID
      const inboxId = this.currentEmail.split('@')[0];
      const url = `https://api.tempail.com/api/v1/inbox/${inboxId}/messages`;
      console.log('[Tempail] API请求:', url);
      
      const response = await fetch(url);
      console.log('[Tempail] API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('[Tempail] API请求失败');
        return [];
      }
      
      const data = await response.json();
      console.log('[Tempail] API返回数据:', JSON.stringify(data, null, 2));
      
      const messages = data.messages || data || [];
      console.log('[Tempail] 邮件数量:', Array.isArray(messages) ? messages.length : 0);
      
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error('[Tempail] 检查邮件异常:', error);
      return [];
    }
  }

  /**
   * 从邮件内容中提取验证码
   */
  extractVerificationCode(mailContent) {
    const patterns = [
      /(\d{6})/,
      /Your verification code is:\s*(\d{6})/i,
      /verification code:\s*(\d{6})/i,
      /code is:\s*(\d{6})/i,
      /验证码[：:]\s*(\d{6})/
    ];
    
    for (const pattern of patterns) {
      const match = mailContent.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * 获取1SecMail邮件详细内容
   */
  async get1SecMailContent(mailId) {
    const { login, domain } = JSON.parse(this.currentToken);
    const response = await fetch(
      `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${mailId}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  }

  /**
   * 获取Tempail邮件详细内容
   */
  async getTempailContent(messageId) {
    const inboxId = this.currentEmail.split('@')[0];
    const response = await fetch(
      `https://api.tempail.com/api/v1/inbox/${inboxId}/messages/${messageId}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  }

  /**
   * 获取Mail.tm邮件详细内容
   */
  async getMailTmContent(messageId) {
    try {
      const response = await fetch(`https://api.mail.tm/messages/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${this.currentToken}`
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[Mail.tm] 获取邮件内容失败:', error);
      return null;
    }
  }

  /**
   * 获取MailDrop邮件详细内容
   */
  async getMailDropContent(messageId) {
    try {
      const response = await fetch(`https://maildrop.cc/api/inbox/${this.currentToken}/${messageId}`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[MailDrop] 获取邮件内容失败:', error);
      return null;
    }
  }

  /**
   * 轮询等待验证码
   */
  async waitForVerificationCode() {
    console.log('[TempMail] waitForVerificationCode 开始');
    console.log('[TempMail] provider:', this.provider);
    console.log('[TempMail] currentEmail:', this.currentEmail);
    console.log('[TempMail] currentToken:', this.currentToken ? '已设置(长度:' + this.currentToken.length + ')' : '未设置');
    console.log('[TempMail] maxAttempts:', this.maxAttempts);
    console.log('[TempMail] pollInterval:', this.pollInterval);
    
    for (let i = 0; i < this.maxAttempts; i++) {
      console.log(`[TempMail] 第 ${i + 1}/${this.maxAttempts} 次检查...`);
      
      try {
        const mails = await this.checkMails();
        console.log(`[TempMail] 收到 ${mails.length} 封邮件`);
      
        for (const mail of mails) {
          // 根据不同provider获取完整邮件内容
          let mailContent = mail;
        
          if (this.provider === '1secmail' || this.provider === 'temp-mail-org') {
            const fullMail = await this.get1SecMailContent(mail.id);
            if (fullMail) {
              mailContent = fullMail;
            }
          } else if (this.provider === 'tempail') {
            const fullMail = await this.getTempailContent(mail.id || mail._id);
            if (fullMail) {
              mailContent = fullMail;
            }
          } else if (this.provider === 'mail-tm') {
            const fullMail = await this.getMailTmContent(mail.id || mail['@id']);
            if (fullMail) {
              mailContent = fullMail;
            }
          } else if (this.provider === 'maildrop') {
            const fullMail = await this.getMailDropContent(mail.id);
            if (fullMail) {
              mailContent = fullMail;
            }
          }
        
          // 提取邮件字段（兼容多种格式）
          const subject = mailContent.subject || mailContent.mail_subject || '';
        
          // 获取邮件正文 - 处理各种格式
          let body = '';
          // 优先使用纯文本
          if (mailContent.text) {
            body = mailContent.text;
          } else if (mailContent.body) {
            body = mailContent.body;
          } else if (mailContent.textBody) {
            body = mailContent.textBody;
          } else if (mailContent.intro) {
            body = mailContent.intro;
          } else if (mailContent.mail_body) {
            body = mailContent.mail_body;
          } else if (mailContent.mail_text) {
            body = mailContent.mail_text;
          } else if (mailContent.htmlBody) {
            body = mailContent.htmlBody;
          } else if (mailContent.html) {
            // html可能是数组（如mail.tm）
            body = Array.isArray(mailContent.html) ? mailContent.html.join('') : mailContent.html;
          }
        
          // 确保body是字符串
          if (typeof body !== 'string') {
            body = String(body || '');
          }
        
          let from = mailContent.from || mailContent.mail_from || mailContent.sender || 
                       mailContent.fromAddr || '';
        
          // 处理from是对象的情况（如mail.tm返回 {address: "xxx", name: "xxx"}）
          if (typeof from === 'object' && from !== null) {
            from = from.address || from.name || JSON.stringify(from);
          }
        
          console.log(`[TempMail] 检查邮件:`);
          console.log(`  From: ${from}`);
          console.log(`  Subject: ${subject}`);
          console.log(`  Body (前100字): ${body.substring(0, 100)}`);
        
          // 检查是否来自 Windsurf
          if (String(from).toLowerCase().includes('windsurf') || 
              String(from).toLowerCase().includes('codeium') ||
              subject.toLowerCase().includes('windsurf') ||
              subject.toLowerCase().includes('verification')) {
          
            console.log(`[TempMail] ✅ 匹配到Windsurf邮件`);
            const code = this.extractVerificationCode(body);
            if (code) {
              console.log(`[TempMail] ✅ 找到验证码: ${code}`);
              return {
                success: true,
                code: code,
                mail: mail
              };
            }
          }
        }
      } catch (error) {
        console.error(`[TempMail] 第 ${i + 1} 次检查出错:`, error);
      }
      
      if (i < this.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
    
    return {
      success: false,
      error: '未能获取验证码'
    };
  }
}

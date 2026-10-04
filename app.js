import { config } from './config.js';
import { normalizeBatch, mergeSamples } from './data.js';
import { storage } from './storage.js';
import { CameraCollector } from './camera.js';
import { buildAIContext } from './assistant.js';
import { replayDemo, demoWindows, DEMO_MINUTES } from './demo.js?v=20261004-demo';
import { bridgeReady, bridgeRequest } from './bridge-client.js?v=20261004-cleanup';

const $ = (s,root=document)=>root.querySelector(s);
const app = $('#app'), modal=$('#modal');
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
 hourglass:'<path d="M7 3h10M7 21h10M8 3v4c0 3 8 7 8 10v4M16 3v4c0 3-8 7-8 10v4"/>',
 minimal:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><path d="M8 8h8v8H8z"/>',
 expand:'<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M3 3l5 5M21 3l-5 5M21 21l-5-5M3 21l5-5"/>',
 volume:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
 mute:'<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3 2.5c-.5.2-.5 1-.5 1.5M12 17h.01"/>',
 logout:'<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M10 12h11M17 8l4 4-4 4"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 eye:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12"/><circle cx="12" cy="12" r="2.5"/>',
 camera:'<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 9 5-3v12l-5-3"/>',
 wrist:'<rect x="7" y="6" width="10" height="12" rx="3"/><path d="m9 6 1-4h4l1 4M9 18l1 4h4l1-4M10 12h4"/>',
 send:'<path d="m3 3 18 9-18 9 3-9-3-9zM6 12h15"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
};
const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]??paths.clock}</svg>`;
const whale=()=>'<img class="deepseek" src="assets/deepseek.svg" alt="" aria-hidden="true"/>';
const words={
 "zh": {
  "working": "专注进行中",
  "current": "当前时间",
  "elapsed": "已工作",
  "session": "本次专注",
  "minimal": "极简模式",
  "full": "完整模式",
  "sound": "通知声音",
  "language": "语言",
  "help": "帮助与数据",
  "logout": "退出登录",
  "camera": "摄像头指数",
  "wrist": "手环指数",
  "measure": "需要休息的概率",
  "waitingCamera": "等待摄像头数据",
  "waitingWrist": "等待手环数据",
  "noSource": "尚未连接",
  "last": "最新窗口",
  "time": "时间",
  "minutes": "分钟",
  "local": "数据保存在浏览器",
  "clockHint": "安心专注，适时休息。",
  "clockHint2": "你的节奏，由你掌握。",
  "companion": "你的专注伙伴",
  "assistant": "专注助手",
  "unconnected": "API 尚未连接",
  "chatTitle": "随时聊聊你的状态",
  "chatBody": "助手会在开始时了解目标，每分钟读取指数，并在结束后总结。",
  "chatPlaceholder": "告诉我你正在做什么…",
  "chatFoot": "对话保存在浏览器",
  "notBuilt": "功能尚未实现",
  "apiMessage": "DeepSeek API 尚未接入。消息已保存，接入后即可发送。",
  "close": "关闭",
  "okay": "知道了",
  "server": "账户与个人数据保存在此浏览器中。",
  "demo": "演示",
  "demoText": "参考 Hamann 与 Carstengerdes（2023）的群体疲劳评分曲线，重新映射为 40 分钟演示：前 15 分钟较低，25 分钟约 40%，40 分钟约 70%。两项指数均为模拟，并非实测概率。",
  "helpText": "横轴是窗口结束时间，纵轴为 0–100% 指数；实时摄像头是实验性信号分数，不能视为疲劳概率。摄像头与手环分别显示；无效窗口保留空缺，不会当作 0%。",
  "data": "查看与导入数据",
  "dataText": "粘贴分析程序的 JSON 输出，可使用单个窗口、数组或 {\"samples\": [...]}。输入有效后，两条图表会更新。",
  "import": "导入数据",
  "importDone": "数据已导入",
  "noData": "暂无数据",
  "invalid": "输入无效",
  "selectLanguage": "选择语言",
  "missing": "暂未接入",
  "sent": "待发送",
  "logoutTitle": "退出本次专注？",
  "logoutText": "本次计时将结束，已保存的图表和对话会保留在你的个人账户中。",
  "cancel": "取消",
  "finish": "退出",
  "sourceHint": "数据连接后显示实时指数",
  "readOnly": "读取输出数据",
  "displayed": "个窗口",
  "startDate": "今天",
  "review": "每分钟检查一次",
  "pending": "已保存，等待 API 接入",
  "network": "连接失败，请稍后重试",
  "forgot": "密码找回服务尚未接入。",
  "jd": "JD 登录尚未接入。",
  "welcome": "欢迎回来。",
  "ready": "准备好开始了吗？",
  "start": "开始专注",
  "logo": "Rest Time 标志",
  "tools": "Rest Time 工具栏",
  "sessionData": "专注时段数据",
  "send": "发送消息",
  "analysisJSON": "分析数据 JSON",
  "focusTitle": "专注",
  "minimalTitle": "极简",
  "authGreeting": "欢迎回来！",
  "signupGreeting": "创建你的账户",
  "nameLabel": "姓名",
  "identityLabel": "用户名 / 邮箱",
  "passwordLabel": "密码",
  "confirmLabel": "确认密码",
  "namePlaceholder": "请输入姓名",
  "identityPlaceholder": "请输入用户名或邮箱",
  "passwordPlaceholder": "请输入密码（8–128 个字符）",
  "confirmPlaceholder": "请再次输入密码",
  "showPassword": "显示密码",
  "hidePassword": "隐藏密码",
  "login": "登录",
  "signup": "注册",
  "forgotLabel": "忘记密码",
  "jdLabel": "使用 JD 继续",
  "or": "或",
  "newAccount": "第一次使用 Rest Time？",
  "existingAccount": "已有 Rest Time 账户？",
  "authFooter": "适时休息，安心专注",
  "allFields": "请填写所有必填项。",
  "passwordMismatch": "两次输入的密码不一致。",
  "passwordLength": "密码需为 8–128 个字符。",
  "fieldLength": "姓名和用户名 / 邮箱不能超过 120 个字符。",
  "accountExists": "该用户名 / 邮箱已被注册。",
  "incorrectAccount": "用户名 / 邮箱或密码错误。",
  "saveFailed": "保存失败，请检查文件夹权限后重试。",
  "operationFailed": "操作未完成，请稍后重试。",
  "invalidJSON": "JSON 格式不正确，请检查标点和括号。",
  "indexRange": "指数须为 0–100 的数字。",
  "windowObject": "每个时间窗口须为一个对象。",
  "timezone": "时间须使用带时区的 ISO 格式。",
  "windowMismatch": "摄像头和手环的时段或会话不一致。",
  "windowCount": "每次可导入 1–10,000 个窗口。",
  "loginRequired": "请先登录。",
  "folderTitle": "本地文件夹",
  "chooseFolder": "选择本地文件夹",
  "reconnectFolder": "连接此文件夹",
  "changeFolder": "更换文件夹",
  "folderHint": "选一个文件夹，账户与数据会自动保存到其中。",
  "folderSelected": "已选择",
  "folderSaved": "已连接本地文件夹",
  "folderLocation": "保存位置",
  "folderUseBrowser": "仅使用浏览器存储",
  "folderBrowserHint": "当前仅保存在浏览器中；选择文件夹后使用该文件夹内的账户。",
  "folderUnsupported": "此浏览器不支持文件夹读写。请使用电脑上的 Chrome 或 Edge，或选择浏览器存储。",
  "folderRequired": "请先点击“选择本地文件夹”，并允许读写权限。",
  "folderPermission": "文件夹读写权限未获准。请点击“连接此文件夹”重新授权。",
  "folderUnavailable": "无法访问此文件夹，请重新连接，或退出登录后选择其他文件夹。",
  "folderWriteFailed": "文件写入失败。请检查文件夹权限和可用磁盘空间。",
  "folderCorrupt": "Rest Time 数据文件格式有误，已停止写入以保留原文件。请恢复文件备份，或退出登录后选择其他文件夹。",
  "folderLogoutFirst": "请先退出登录，再更换存储方式或文件夹。",
  "folderInfo": "网站会在你选择的文件夹中创建 rest-time-data 子文件夹，保存账户、图表和对话。权限失效时，需要重新授权。",
  "folderFoot": "数据保存在本地文件夹",
  "folderChat": "对话保存在本地文件夹",
  "browserSelected": "已切换为浏览器存储",
  "storageSeparate": "不同文件夹与浏览器存储中的账户互相独立。",
  "soundOn": "通知声音已开启",
  "soundOff": "通知声音已关闭",
  "tryDemo": "体验演示",
  "demoLabel": "研究曲线改编演示 · 2 秒回放 1 分钟",
  "demoIsolated": "演示不会写入你的个人数据",
  "scriptedDemo": "演示脚本（未调用 AI）",
  "testModel": "服务模型",
  "aiSettings": "AI 服务",
  "endSession": "结束计时",
  "stopped": "计时已结束",
  "wrapupHint": "可以补充完成情况、打断或感受；也可以直接生成总结。",
  "skipSummary": "无需补充，生成总结",
  "newSession": "开始新时段",
  "aiThinking": "助手正在思考…",
  "retry": "重试",
  "completed": "完成情况",
  "patterns": "状态与数据",
  "next_steps": "下一步",
  "pauseDemo": "暂停",
  "resumeDemo": "继续",
  "nextDemo": "下一分钟",
  "exitDemo": "退出演示",
  "aiNeedsKey": "尚未配置 DeepSeek 后台，请按安装说明设置 config.js。",
  "aiNetwork": "AI 网络连接失败，请检查网络后重试。",
  "aiUnauthorized": "AI 服务暂不可用，请稍后重试。",
  "aiRateLimit": "已达到请求限额，请稍后重试。",
  "aiHTTP": "AI 服务暂时不可用，请重试。",
  "aiInvalid": "AI 返回格式无效，或消息超出限制，请重试或缩短消息。",
  "aiTimeout": "AI 请求超时，请重试。",
  "aiBadEndpoint": "AI 连接地址无效。",
  "aiConnectionText": "专注助手会自动连接，无需额外登录。每分钟发送本次指数、个人偏好与对话用于分析；账户密码不会发送。演示使用本地脚本，不调用 AI。",
  "demoSource": "数据来源与改编",
  "demoMeasure": "模拟休息指数（非实测概率）",
  "aiBalance": "DeepSeek 账户余额不足，请由网站管理员充值。",
  "aiOrigin": "后台尚未允许此网站域名，请检查 ALLOWED_ORIGINS。",
  "connectAI": "连接专注助手",
  "aiPrivacy": "发送个人偏好、会话指数与对话给 AI",
  "cameraSetup": "摄像头采集",
  "cameraEnable": "启用摄像头",
  "cameraDisable": "关闭摄像头",
  "cameraPrivacy": "仅在此设备分析画面，不录制、不保存、不上传照片或视频。每分钟保存一项实验性指数与覆盖率，并发送给专注助手。",
  "cameraMethod": "根据持续闭眼和持续张嘴计算实验性信号指数，不能视为经过验证的疲劳概率。保持正面、单人和明亮环境；检测不足时图表留空。首次结果约需一分钟。",
  "cameraOff": "摄像头未启用",
  "cameraLoading": "正在加载摄像头模型…",
  "cameraRunning": "采集中 · 每分钟更新",
  "cameraTracking": "已识别人脸 · 采集中",
  "cameraNoFace": "未可靠识别单个人脸 · 此时段记为缺失",
  "cameraPaused": "页面隐藏 · 暂停分析",
  "cameraSessionOnly": "请先开始真实专注时段，再启用摄像头。",
  "cameraDemo": "演示仅使用模拟数据，不会启用摄像头。",
  "cameraDenied": "摄像头权限未获准，请在浏览器的网站权限中允许后重试。",
  "cameraMissing": "未找到摄像头，请连接设备后重试。",
  "cameraBusy": "摄像头无法使用，可能正在被其他应用占用。",
  "cameraUnsupported": "摄像头需要 HTTPS 和支持摄像头访问的浏览器。请使用网站地址打开，勿直接打开本地 HTML 文件。",
  "cameraLoadFailed": "无法启动摄像头分析。请确认 assets/mediapipe 全部文件已上传，并尝试较新的 Chrome 或 Edge。",
  "cameraEnded": "摄像头已断开或权限被撤销，请重新启用。",
  "cameraMeasure": "实验性摄像头信号指数（非验证概率）",
  "mixedMeasure": "摄像头指数（可能包含实验性信号）"
 },
 "en": {
  "working": "Focus in progress",
  "current": "Current time",
  "elapsed": "Time working",
  "session": "This session",
  "minimal": "Minimal mode",
  "full": "Full mode",
  "sound": "Notification sound",
  "language": "Language",
  "help": "Help & data",
  "logout": "Log out",
  "camera": "Camera index",
  "wrist": "Wrist index",
  "measure": "Probability of needing rest",
  "waitingCamera": "Waiting for camera data",
  "waitingWrist": "Waiting for wrist data",
  "noSource": "Not connected",
  "last": "Latest window",
  "time": "Time",
  "minutes": "min",
  "local": "Data stored in this browser",
  "clockHint": "A little focus. A little breathing room.",
  "clockHint2": "Work at your own pace.",
  "companion": "YOUR FOCUS COMPANION",
  "assistant": "Focus assistant",
  "unconnected": "API not connected",
  "chatTitle": "A space to check in",
  "chatBody": "The assistant asks about your goal, reads indices every minute, and summarizes when you finish.",
  "chatPlaceholder": "What are you working on?",
  "chatFoot": "Chats stay in this browser",
  "notBuilt": "Not implemented yet",
  "apiMessage": "The DeepSeek API is not connected. Your message is saved for later integration.",
  "close": "Close",
  "okay": "Got it",
  "server": "Accounts and personal data are stored in this browser.",
  "demo": "Demo",
  "demoText": "Based on the group fatigue-rating curve in Hamann & Carstengerdes (2023), remapped to a 40-minute demo: low for 15 minutes, about 40% at minute 25 and 70% at minute 40. Both indices are simulations, not measured probabilities.",
  "helpText": "The x-axis is the window end time. The y-axis is an index from 0–100%. Live camera scores are experimental signals, not fatigue probabilities. Camera and wrist are shown separately; invalid windows stay as gaps, rather than becoming 0%.",
  "data": "View & import data",
  "dataText": "Paste JSON output from the analysis code: one window, an array, or {\"samples\": [...]}. Valid input updates both charts.",
  "import": "Import data",
  "importDone": "Data imported",
  "noData": "No data yet",
  "invalid": "Invalid input",
  "selectLanguage": "Choose language",
  "missing": "Not connected yet",
  "sent": "Pending",
  "logoutTitle": "End this focus session?",
  "logoutText": "The timer will end. Saved charts and chats will remain in your personal account.",
  "cancel": "Cancel",
  "finish": "Log out",
  "sourceHint": "Indices will appear when data is connected",
  "readOnly": "View output data",
  "displayed": "windows",
  "startDate": "Today",
  "review": "Checked every minute",
  "pending": "Saved, waiting for API integration",
  "network": "Connection failed. Please try again.",
  "forgot": "Password recovery is not implemented yet.",
  "jd": "JD sign-in is not implemented yet.",
  "welcome": "Welcome Back.",
  "ready": "Ready to Start?",
  "start": "Start a focus session",
  "logo": "Rest Time logo",
  "tools": "Rest Time tools",
  "sessionData": "Focus session data",
  "send": "Send message",
  "analysisJSON": "Analysis JSON",
  "focusTitle": "Focus",
  "minimalTitle": "Minimal",
  "authGreeting": "Welcome Back!",
  "signupGreeting": "Create your account",
  "nameLabel": "Name",
  "identityLabel": "Username / Email",
  "passwordLabel": "Password",
  "confirmLabel": "Confirm Password",
  "namePlaceholder": "Your name",
  "identityPlaceholder": "Enter your username or email",
  "passwordPlaceholder": "Enter a password (8–128 characters)",
  "confirmPlaceholder": "Re-enter your password",
  "showPassword": "Show password",
  "hidePassword": "Hide password",
  "login": "Log in",
  "signup": "Sign In",
  "forgotLabel": "Forgot Password",
  "jdLabel": "Continue with JD",
  "or": "or",
  "newAccount": "New to Rest Time?",
  "existingAccount": "Already with Rest Time?",
  "authFooter": "A LITTLE BREATHING ROOM",
  "allFields": "Please complete all fields.",
  "passwordMismatch": "Passwords do not match.",
  "passwordLength": "Use a password of 8–128 characters.",
  "fieldLength": "Name and username / email must be at most 120 characters.",
  "accountExists": "An account with this username / email already exists.",
  "incorrectAccount": "Incorrect username / email or password.",
  "saveFailed": "Unable to save. Check folder permission and try again.",
  "operationFailed": "The operation could not be completed. Please try again.",
  "invalidJSON": "Invalid JSON. Check punctuation and brackets.",
  "indexRange": "Index must be a number between 0 and 100.",
  "windowObject": "Each window must be an object.",
  "timezone": "Use an ISO timestamp with a timezone.",
  "windowMismatch": "Camera and wrist windows or sessions do not match.",
  "windowCount": "Import between 1 and 10,000 windows.",
  "loginRequired": "Please log in.",
  "folderTitle": "Local folder",
  "chooseFolder": "Choose a local folder",
  "reconnectFolder": "Connect this folder",
  "changeFolder": "Change folder",
  "folderHint": "Choose a folder to automatically save your accounts and data.",
  "folderSelected": "Selected",
  "folderSaved": "Local folder connected",
  "folderLocation": "Save location",
  "folderUseBrowser": "Use browser storage only",
  "folderBrowserHint": "Data stays in this browser. Choosing a folder uses the accounts in that folder.",
  "folderUnsupported": "Folder read/write is unavailable in this browser. Use desktop Chrome or Edge, or choose browser storage.",
  "folderRequired": "Choose a local folder and allow read/write access first.",
  "folderPermission": "Folder read/write permission is needed. Click “Connect this folder” to allow it again.",
  "folderUnavailable": "This folder is unavailable. Reconnect it, or log out and choose another folder.",
  "folderWriteFailed": "Unable to write files. Check folder permissions and available disk space.",
  "folderCorrupt": "Rest Time data has an invalid format. Writing stopped to preserve the original files. Restore a backup, or log out and choose another folder.",
  "folderLogoutFirst": "Log out before changing your folder or storage method.",
  "folderInfo": "The website creates a rest-time-data subfolder in your chosen folder for accounts, charts and chats. Allow access again if permission expires.",
  "folderFoot": "Data stored in a local folder",
  "folderChat": "Chats stay in your local folder",
  "browserSelected": "Switched to browser storage",
  "storageSeparate": "Accounts in different folders and browser storage are separate.",
  "soundOn": "Sound on",
  "soundOff": "Sound off",
  "tryDemo": "Try the demo",
  "demoLabel": "Research-adapted demo · 1 min per 2 sec",
  "demoIsolated": "Demo does not change your personal data",
  "scriptedDemo": "Scripted demo (no AI call)",
  "testModel": "Service model",
  "aiSettings": "AI service",
  "endSession": "End session",
  "stopped": "Timer stopped",
  "wrapupHint": "Optionally add completion, interruptions or how you felt, or generate the summary now.",
  "skipSummary": "Skip and generate summary",
  "newSession": "Start another session",
  "aiThinking": "Assistant is thinking…",
  "retry": "Retry",
  "completed": "Completed",
  "patterns": "Patterns & coverage",
  "next_steps": "Next steps",
  "pauseDemo": "Pause",
  "resumeDemo": "Resume",
  "nextDemo": "Next minute",
  "exitDemo": "Exit demo",
  "aiNeedsKey": "DeepSeek backend is not configured. Set config.js using the setup guide.",
  "aiNetwork": "AI connection failed. Check your network and retry.",
  "aiUnauthorized": "AI service is unavailable. Please try again later.",
  "aiRateLimit": "The request limit has been reached. Please try again later.",
  "aiHTTP": "AI service is unavailable. Please retry.",
  "aiInvalid": "Invalid AI response or oversized message. Retry or shorten your message.",
  "aiTimeout": "AI request timed out. Please retry.",
  "aiBadEndpoint": "Invalid AI connection address.",
  "aiConnectionText": "The assistant connects automatically with no extra sign-in. Session indices, preferences and conversation are sent for analysis every minute; account passwords are excluded. The demo uses local scripts without AI calls.",
  "demoSource": "Source & adaptation",
  "demoMeasure": "Simulated rest index (not measured probability)",
  "aiBalance": "The DeepSeek account has insufficient balance. The site owner needs to add credit.",
  "aiOrigin": "This website origin is not allowed. Check ALLOWED_ORIGINS.",
  "connectAI": "Connect focus assistant",
  "aiPrivacy": "Preferences, session indices and chat are sent to AI",
  "cameraSetup": "Camera collection",
  "cameraEnable": "Enable camera",
  "cameraDisable": "Turn camera off",
  "cameraPrivacy": "Frames are analyzed on this device. No photos or video are recorded, saved or uploaded. A minute-level experimental score and coverage are saved and sent to the focus assistant.",
  "cameraMethod": "Sustained eye closure and mouth opening produce an experimental signal score, not a validated fatigue probability. Face the camera alone in good light; insufficient detection leaves gaps. The first result takes about a minute.",
  "cameraOff": "Camera is off",
  "cameraLoading": "Loading camera model…",
  "cameraRunning": "Collecting · minute updates",
  "cameraTracking": "Face tracked · collecting",
  "cameraNoFace": "No single reliable face · missing data",
  "cameraPaused": "Page hidden · analysis paused",
  "cameraSessionOnly": "Start a real focus session before enabling the camera.",
  "cameraDemo": "The demo uses simulated data and does not enable the camera.",
  "cameraDenied": "Camera permission was denied. Allow it in this site’s browser permissions and try again.",
  "cameraMissing": "No camera was found. Connect a camera and try again.",
  "cameraBusy": "The camera is unavailable or being used by another application.",
  "cameraUnsupported": "Camera access requires HTTPS and a supported browser. Open the website URL rather than a local HTML file.",
  "cameraLoadFailed": "Camera analysis could not start. Upload every assets/mediapipe file and try a recent Chrome or Edge.",
  "cameraEnded": "The camera disconnected or permission was revoked. Enable it again.",
  "cameraMeasure": "Experimental camera signal score (not validated probability)",
  "mixedMeasure": "Camera index (may include experimental signals)"
 }
};
let user=null,personal=null,route='login',chatOpen=false,unread=false,range=30,audio=null,folderReady=false;
let uiLanguage='zh';
try{const savedLanguage=localStorage.getItem('rt-language');if(['zh','en'].includes(savedLanguage))uiLanguage=savedLanguage;}catch{}
let toastTimer,saveChain=Promise.resolve();
const currentLanguage=()=>personal?.language==='en'?'en':personal?.language==='zh'?'zh':uiLanguage;
const t=(key)=>words[currentLanguage()][key]??key;
let demoState=null,aiBusy=false,aiFailure=null,aiController=null,aiGeneration=0,lastAIRequest=null,nextObserve=0,lastNudge=0;
const camera=new CameraCollector({onWindow:row=>{
 if(demoState||!personal||row.session_id!==personal.workSession?.id)return;
 personal.samples=mergeSamples(personal.samples,normalizeBatch(row));
 renderCharts();void save().catch(()=>{});
},onState:state=>{updateCameraStatus(state);if(['cameraEnded','cameraLoadFailed'].includes(state))notify(t(state));}});
function cameraActive(){return camera.status().state!=='off';}
function cameraStatusKey(state){return ({off:'cameraOff',loading:'cameraLoading',running:'cameraRunning',tracking:'cameraTracking',noFace:'cameraNoFace',paused:'cameraPaused'})[state]??state;}
function updateCameraStatus(state=camera.status().state){
 for(const node of document.querySelectorAll('[data-camera-status]'))node.textContent=t(cameraStatusKey(state));
 for(const node of document.querySelectorAll('[data-action="camera-settings"]')){node.classList.toggle('selected',cameraActive());node.setAttribute('aria-pressed',String(cameraActive()));}
 const enable=$('[data-action="camera-enable"]'),stop=$('[data-action="camera-disable"]');
 if(enable)enable.hidden=cameraActive();if(stop)stop.hidden=!cameraActive();
 for(const node of document.querySelectorAll('[data-camera-measure]'))node.textContent=t(demoState?'demoMeasure':cameraMeasureKey());
 const preview=$('#camera-preview');if(preview&&preview.srcObject!==camera.status().stream){preview.srcObject=camera.status().stream;if(preview.srcObject)preview.play().catch(()=>{});}
}
function openCamera(){
 if(demoState){dialog(t('cameraSetup'),`<p class="modal-text">${t('cameraDemo')}</p>`);return;}
 dialog(t('cameraSetup'),`<p class="modal-text">${t('cameraPrivacy')}</p><video class="camera-preview" id="camera-preview" autoplay muted playsinline aria-label="${t('cameraSetup')}"></video><p class="camera-status" data-camera-status></p><p class="modal-text">${t('cameraMethod')}</p>`,`<button class="secondary" data-action="camera-disable">${t('cameraDisable')}</button><button class="primary" data-action="camera-enable">${t('cameraEnable')}</button>`);updateCameraStatus();
}
function cameraMeasureKey(){return cameraActive()||personal.samples.some(s=>s.camera_meta?.method==='eye_mouth_heuristic_v1')?'cameraMeasure':'measure';}
function sessionNow(){return personal?.workSession?.endedAt??(demoState?demoState.base+demoState.index*60000:Date.now());}
function openAISettings(){dialog(t('aiSettings'),`<p class="modal-text">${t('aiConnectionText')}</p><p class="modal-text">${escape(config.assistantModel)} · ${t('testModel')} · 60s</p>`);}
function cancelAI(){aiGeneration++;aiController?.abort();aiBusy=false;aiFailure=null;}
function appendAssistant(content,extra={}){personal.messages.push({role:'assistant',content,sessionId:personal.workSession.id,timestamp:new Date().toISOString(),...extra});personal.messages=personal.messages.slice(-300);}
async function startSession(){camera.stop();cancelAI();if(demoState){demoState.index=0;demoState.paused=false;demoState.decision=null;personal.samples=[];}const started=demoState?demoState.base:Date.now();personal.sessionStarted=started;personal.workSession={id:crypto.randomUUID(),startedAt:started,endedAt:null,status:'active'};nextObserve=Date.now()+60000;chatOpen=true;await save();history.replaceState(null,'','#active');render();await runAI('start');}
async function endSession(){if(personal.workSession?.status!=='active')return;camera.flush(sessionNow(),true);camera.stop(false);cancelAI();personal.workSession.endedAt=sessionNow();personal.workSession.status='awaiting_wrapup';if(demoState)demoState.paused=true;chatOpen=true;await save();render();await runAI('end_checkin');}
function scriptedReply(event){const zh=currentLanguage()==='zh';const decision=demoState?.decision;let action='continue',message='';let summary=null;
 if(event==='start'){action='ask_setup';message=zh?'这次准备完成什么？计划专注多久？现在精力如何？':'What will you work on, for how long, and how is your energy?';}
 if(event==='message'){action='refocus';message=zh?'演示会继续回放状态变化。请将注意力放回本次目标；连接 AI 后可获得针对你的回答。':'The demo will continue replaying changing signals. Return to your goal; connect AI for a personalized reply.';}
 if(event==='observe'&&['watch','break_recommended'].includes(decision?.status)){action=decision.status==='watch'?'quick_reset':'rest';message=zh?(action==='rest'?'演示中连续三个窗口偏高，可以结束本次计时并休息。':'演示指数上升：试着放松肩膀、调整坐姿，再继续专注。'):(action==='rest'?'Three demo windows remain elevated. Consider ending the session and taking a rest.':'Demo indices are rising. Relax your shoulders and reset your posture.');}
 if(event==='end_checkin'){action='ask_wrapup';message=zh?'计时已停止。想在总结前补充完成情况、打断或感受吗？':'The timer has stopped. Would you like to add completion, interruptions or how you felt before the summary?';}
 if(event==='summary'){action='summary';message=zh?'以下是演示摘要。':'Here is the demo summary.';summary={headline:zh?'演示时段回顾':'Demo session review',completed:[zh?`回放了 ${demoState.index} 个一分钟窗口；未确认真实任务完成情况。`:`Replayed ${demoState.index} one-minute windows; no real task completion was established.`],patterns:[zh?`已回放窗口中，摄像头缺失 ${personal.samples.filter(s=>s.camera_index===null).length} 个，手环缺失 ${personal.samples.filter(s=>s.wrist_index===null).length} 个；缺失值不计为零。`:`Replayed windows contain ${personal.samples.filter(s=>s.camera_index===null).length} camera gaps and ${personal.samples.filter(s=>s.wrist_index===null).length} wrist gaps. Missing values are not zero.`],next_steps:[zh?'休息后再确定下一时段目标。':'Take a break and choose the next session goal.']};}
 return {action,message,summary,questions:[],profile_patch:{}};
}
async function runAI(event,message=''){
 if(aiBusy||!personal?.workSession)return;const generation=++aiGeneration,sessionId=personal.workSession.id;lastAIRequest=[event,message];aiFailure=null;aiBusy=true;aiController=new AbortController();const controller=aiController;const timeout=setTimeout(()=>controller.abort(),55000);render();
 try{let result;if(demoState)result=scriptedReply(event);else{const context=buildAIContext(personal,event,message,Boolean(demoState),demoState?.decision??null,sessionNow());result=await bridgeRequest(context,aiController.signal);}
  if(generation!==aiGeneration||personal?.workSession?.id!==sessionId)return;
  const nudge=event==='observe'&&['quick_reset','rest'].includes(result.action);const show=result.message&&(event!=='observe'||!nudge||Date.now()-lastNudge>180000||demoState);
  if(show){appendAssistant(result.message,{action:result.action,summary:result.summary,scripted:Boolean(demoState)});if(nudge){lastNudge=Date.now();if(!chatOpen)unread=true;chime();}}
  if(!demoState)personal.profile={...personal.profile,...result.profile_patch};
  if(event==='summary'){personal.workSession.status='completed';personal.workSession.summary=result.summary;personal.sessions=[...(personal.sessions??[]).filter(v=>v.id!==sessionId),structuredClone(personal.workSession)].slice(-50);}
  await save();
 }catch(error){if(generation===aiGeneration)aiFailure=error.name==='AbortError'?{code:'aiTimeout'}:error;}
 finally{clearTimeout(timeout);if(generation===aiGeneration){aiBusy=false;render();}}
}
function demoBanner(){return demoState?`<div class="demo-banner"><span>${t('demoLabel')} · ${demoState.index}/${DEMO_MINUTES} <button data-action="demo-source">${t('demoSource')}</button></span><div><button data-action="demo-pause" ${personal.workSession?.status!=='active'||demoState.index>=DEMO_MINUTES?'disabled':''}>${t(demoState.paused?'resumeDemo':'pauseDemo')}</button><button data-action="demo-step" ${demoState.index>=DEMO_MINUTES||personal.workSession?.status!=='active'?'disabled':''}>${t('nextDemo')}</button><button data-action="demo-exit">${t('exitDemo')}</button></div></div>`:'';}
function startDemo(){if(demoState){modal.close();return;}camera.stop();cancelAI();const language=currentLanguage();demoState={backup:{user,personal,route},base:Date.now()-DEMO_MINUTES*60000,index:0,paused:false,decision:null};user={id:'demo',name:language==='zh'?'演示':'Demo',identity:'demo'};personal={id:'demo',profile:{},language,sound:true,messages:[],samples:[],sessions:[],sessionStarted:null};modal.close();history.replaceState(null,'','#welcome');render();}
function stepDemo(){if(!demoState||!personal.workSession||personal.workSession.status!=='active'||demoState.index>=DEMO_MINUTES)return;demoState.index++;const result=replayDemo(demoState.base,demoState.index);personal.samples=result.samples;const previous=demoState.decision?.status;demoState.decision=result.decision;if(demoState.index===DEMO_MINUTES)demoState.paused=true;renderCharts();updateClock();const banner=$('.demo-banner');if(banner)banner.outerHTML=demoBanner();if(demoState.index===DEMO_MINUTES){void endSession();return;}if(previous!==result.decision.status&&['watch','break_recommended'].includes(result.decision.status))runAI('observe');}
function exitDemo(){cancelAI();const backup=demoState.backup;user=backup.user;personal=backup.personal;demoState=null;chatOpen=false;modal.close();history.replaceState(null,'','#'+backup.route);render();}
const lang=()=>currentLanguage()==='en'?'en-GB':'zh-CN';
function rememberLanguage(){uiLanguage=currentLanguage();try{localStorage.setItem('rt-language',uiLanguage);}catch{}}
function errorText(error){
 if(error.code&&Object.hasOwn(words.zh,error.code))return t(error.code);
 if(error instanceof SyntaxError)return t('invalidJSON');
 const message=String(error.message??'');
 const errors={'Invalid camera metadata.':'invalid','Index must be a number between 0 and 100.':'indexRange','Each window must be an object.':'windowObject','Use an ISO timestamp with a timezone.':'timezone','Import between 1 and 10,000 windows.':'windowCount','Account already exists':'accountExists','Incorrect username / email or password':'incorrectAccount','Please log in':'loginRequired','DeepSeek API is not connected yet.':'apiMessage'};
 if(errors[message])return t(errors[message]);if(message.startsWith('Mismatched '))return t('windowMismatch');
 return t('operationFailed');
}
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function save(){if(!personal||demoState)return Promise.resolve();const snapshot=structuredClone(personal);saveChain=saveChain.catch(()=>{}).then(()=>storage.savePersonal(snapshot));return saveChain.catch(error=>{notify(errorText(error));throw error;});}
function dialog(title,body,actions=''){if(modal.open)modal.close();$('#modal-content').innerHTML=`<div class="modal-inner"><div class="modal-header"><h2 id="modal-title">${escape(title)}</h2><button class="close-button" data-action="close-modal" aria-label="${t('close')}">${icon('close')}</button></div>${body}<div class="modal-actions">${actions||`<button class="primary" data-action="close-modal">${t('okay')}</button>`}</div></div>`;modal.showModal();}
function unavailable(message){dialog(t('notBuilt'),`<p class="modal-text">${escape(message)}</p>`);}
function setRoute(next){location.hash=next;}
function languageButton(){return `<button class="auth-language" data-action="language" aria-label="${t('language')}">${currentLanguage()==='zh'?'中文 / EN':'EN / 中文'}</button>`;}
function folderControls(){
 const state=storage.status();
 const label=state.mode==='folder'&&state.selected?t('reconnectFolder'):t('chooseFolder');
 return `<div class="folder-controls"><div class="folder-heading">${icon('lock')}<span>${t('folderTitle')}</span></div><p class="folder-description">${state.mode==='folder'?(state.selected?`${t('folderSelected')}：${escape(state.name)} / rest-time-data${folderReady?'':` · ${t('folderPermission')}`}`:t('folderHint')):state.supported?t('folderBrowserHint'):t('folderUnsupported')}</p><div class="folder-buttons">${state.supported?`<button type="button" class="secondary folder-connect" data-action="connect-folder">${label}</button>`:''}${state.selected?`<button type="button" class="text-button" data-action="change-folder">${t('changeFolder')}</button>`:''}${state.mode==='folder'?`<button type="button" class="text-button" data-action="browser-storage">${t('folderUseBrowser')}</button>`:''}</div></div>`;
}
function auth(signup=false){
 const placeholders={identity:'identityPlaceholder',name:'namePlaceholder',confirm:'confirmPlaceholder',password:'passwordPlaceholder'};
 const field=(name,label,type='text',autocomplete='')=>`<label class="field" for="${name}">${t(label)}<span class="input-wrap"><input id="${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" required ${name==='password'?'minlength="8" maxlength="128" data-password':name==='confirm'?'minlength="8" maxlength="128" data-password':'maxlength="120"'} placeholder="${t(placeholders[name])}" />${type==='password'?`<button type="button" class="password-toggle" data-action="show-password" data-target="${name}" aria-label="${t('showPassword')}">${icon('eye')}</button>`:''}</span></label>`;
 return `<main class="blue-screen">${languageButton()}<img class="auth-corner" src="assets/logo.png" alt="${t('logo')}"/><section class="auth-card ${signup?'signup-card':''}" aria-labelledby="auth-title"><h1 id="auth-title" class="auth-title">Rest Time</h1><p class="auth-greeting">${t(signup?'signupGreeting':'authGreeting')}</p>${folderControls()}<form class="auth-form" id="auth-form" data-signup="${signup}" novalidate>${signup?field('name','nameLabel','text','name'):''}${field('identity','identityLabel','text','username')}${field('password','passwordLabel','password',signup?'new-password':'current-password')}${signup?field('confirm','confirmLabel','password','new-password'):''}<p class="form-error" id="auth-error" role="alert"></p><button class="primary auth-submit" type="submit">${t(signup?'signup':'login')}</button>${signup?'':`<button type="button" class="text-button forgot" data-action="forgot">${t('forgotLabel')}</button>`}</form><div class="separator"><span>${t('or')}</span></div><button class="secondary jd-button" data-action="jd"><span class="jd-mark" aria-hidden="true">JD</span>${t('jdLabel')}</button><p class="auth-switch">${t(signup?'existingAccount':'newAccount')} <a href="#${signup?'login':'signup'}">${t(signup?'login':'signup')}</a></p><button class="text-button demo-entry" data-action="demo">${t('tryDemo')}</button><p class="local-note">${t(storage.status().mode==='folder'?'folderFoot':'local')}</p></section><span class="auth-footer">REST TIME / ${t('authFooter')}</span></main>`;
}
function welcome(){return `<main class="blue-screen">${languageButton()}<img class="auth-corner" src="assets/logo.png" alt="${t('logo')}"/><section class="welcome"><button class="start-button" data-action="start" aria-label="${t('start')}"><img src="assets/logo.png" alt=""/></button><h1>${t('welcome')}</h1><p>${t('ready')}</p><div class="eyebrow">REST TIME</div><button class="welcome-connect" data-action="ai-settings">${t('aiSettings')}</button>${demoState?`<p class="demo-welcome">${t('demoLabel')}</p>`:''}</section><button class="welcome-logout" data-action="logout-welcome">${t('logout')}</button></main>`;}
function tool(name,label,action,selected=false){return `<button class="tool ${selected?'selected':''}" data-action="${action}" aria-label="${escape(label)}" data-tip="${escape(label)}" ${action==='sound'?`aria-pressed="${personal.sound}"`:action==='mode'?`aria-pressed="${route==='minimal'}"`:''}>${name==='language'?'<span class="language-icon" aria-hidden="true">中 / A</span>':icon(name)}</button>`;}
function sidebar(){return `<aside class="sidebar" aria-label="${t('tools')}"><button class="assistant-button" data-action="chat" aria-label="DeepSeek ${t('assistant')}" aria-pressed="${chatOpen}" title="DeepSeek">${whale()}<span class="notification-dot ${unread?'unread':''}" aria-hidden="true"></span></button><div class="side-rule"></div>${tool(route==='minimal'?'expand':'minimal',route==='minimal'?t('full'):t('minimal'),'mode',route==='minimal')}${tool(personal.sound?'volume':'mute',t('sound'),'sound')}${tool('language',t('language'),'language')}${tool('camera',t('cameraSetup'),'camera-settings',cameraActive())}${tool('help',t('help'),'help')}${tool('lock',t('aiSettings'),'ai-settings')}<div class="sidebar-bottom"><span class="avatar" title="${escape(user.name)}">${escape(user.name.slice(0,1).toUpperCase())}</span>${tool('logout',t('logout'),'logout')}</div></aside>`;}
function timePart(working=false){return `<div class="time-part"><div class="time-label">${icon(working?'hourglass':'clock')}${t(working?'elapsed':'current')}</div><div class="time-value ${working?'work-time':''}" data-time="${working?'elapsed':'current'}">00:00<span class="seconds">00</span></div><div class="time-sub">${working?t('session'):new Date().toLocaleDateString(lang(),{month:'long',day:'numeric',weekday:'short'})}</div></div>`;}
function graph(kind){return `<section class="chart-card ${kind}" aria-labelledby="${kind}-heading"><div class="chart-top"><h2 class="chart-name" id="${kind}-heading"><span class="chart-icon">${icon(kind)}</span>${t(kind)}</h2><div class="chart-score" data-score="${kind}">—<span>%</span></div></div><div class="chart-meta"><span ${kind==='camera'?'data-camera-measure':''}>${t(demoState?'demoMeasure':kind==='camera'?cameraMeasureKey():'measure')}</span><select data-range="${kind}" aria-label="${t('time')}">${[15,30,60].map(v=>`<option value="${v}" ${range===v?'selected':''}>${v} ${t('minutes')}</option>`).join('')}</select></div><div class="chart-frame" data-frame="${kind}"><svg class="plot" viewBox="0 0 520 145" role="img" aria-label="${t(kind)}: ${t(demoState?'demoMeasure':kind==='camera'?cameraMeasureKey():'measure')}" data-chart="${kind}"></svg><div class="empty-chart" data-empty="${kind}">${t(kind==='camera'?'waitingCamera':'waitingWrist')}</div><div class="chart-tooltip" data-tooltip="${kind}" hidden></div></div><div class="chart-foot"><span class="chart-key">${t('last')}</span><span data-last="${kind}">${t('noSource')}</span></div></section>`;}
function chat(){return `<section class="chat-panel" aria-label="${t('assistant')}"><header class="chat-head"><div><div class="chat-brand">${whale()}${t('assistant')}</div><button class="chat-badge text-button" data-action="ai-settings">${demoState?t('scriptedDemo'):bridgeReady()?'DeepSeek · '+t('testModel'):t('connectAI')}</button></div><button class="close-button" data-action="chat" aria-label="${t('close')}">${icon('close')}</button></header><div class="chat-messages" id="chat-messages" aria-live="polite">${chatMessages()}</div><div class="ai-state">${aiBusy?t('aiThinking'):aiFailure?`<span>${escape(errorText(aiFailure))}</span> <button class="text-button" data-action="retry-ai">${t('retry')}</button>`:''}</div>${personal.workSession?.status==='awaiting_wrapup'?`<div class="wrapup"><p>${t('wrapupHint')}</p><button class="text-button" data-action="summarize">${t('skipSummary')}</button></div>`:''}${personal.workSession?.status==='completed'?`<div class="wrapup"><button class="primary" data-action="new-session">${t('newSession')}</button></div>`:`<div class="chat-input"><form id="chat-form"><label class="sr-only" for="chat-message">${t('chatPlaceholder')}</label><textarea id="chat-message" name="message" placeholder="${t('chatPlaceholder')}" maxlength="4000" required></textarea><button type="submit" class="send-button" aria-label="${t('send')}" ${aiBusy?'disabled':''}>${icon('send')}</button></form><div class="chat-disclaimer">${demoState?t('demoIsolated'):t('aiPrivacy')}</div></div>`}</section>`;}
function chatMessages(){const messages=personal.messages.filter(m=>!m.sessionId||m.sessionId===personal.workSession?.id);return messages.length?messages.map(m=>`<div class="message ${m.role==='assistant'?'assistant':''}">${escape(m.content)}${m.summary?`<div class="summary-card"><h3>${escape(m.summary.headline)}</h3>${['completed','patterns','next_steps'].map(k=>`<h4>${t(k)}</h4><ul>${m.summary[k].map(v=>`<li>${escape(v)}</li>`).join('')}</ul>`).join('')}</div>`:''}${m.scripted?`<div class="message-meta">${t('scriptedDemo')}</div>`:''}</div>`).join(''):`<div class="chat-empty">${whale()}<strong>${t('chatTitle')}</strong>${t('chatBody')}</div>`;}
function workspace(){const mini=route==='minimal';return `<div class="workspace ${mini?'minimal':''} ${chatOpen?'chat-open':''}">${sidebar()}<main class="main"><header class="workspace-header"><div class="brand">Rest Time</div><div class="session-label">${icon('hourglass')}${t(personal.workSession?.endedAt?'stopped':'working')}</div><button class="end-button" data-action="end-session" ${personal.workSession?.endedAt?'disabled':''}>${t('endSession')}</button><div class="header-date">${new Date().toLocaleDateString(lang(),{month:'short',day:'numeric',weekday:'long'})}</div></header>${demoBanner()}${mini?`<div class="minimal-layout"><div class="minimal-chat">${chatOpen?chat():''}</div><section class="minimal-clock" aria-label="${t('session')}">${timePart()}<div class="minimal-divider"></div>${timePart(true)}<div class="minimal-caption">REST TIME / ${t('companion')}</div></section></div>`:`<div class="work-layout">${chatOpen?chat():`<section class="companion-panel"><img class="companion-logo" src="assets/logo.png" alt="${t('logo')}"/><p class="companion-copy">${t('clockHint')}<br/>${t('clockHint2')}</p><div class="companion-bottom"><span class="quiet-line"></span>${t('companion')}</div></section>`}<section class="data-side" aria-label="${t('sessionData')}"><div class="time-card">${timePart()}${timePart(true)}</div>${graph('camera')}${graph('wrist')}</section></div>`}<footer class="work-footer"><span>${demoState?t('demoLabel'):t('sourceHint')}</span><span class="local-pill">${icon('lock')}${demoState?t('demoIsolated'):t(storage.status().mode==='folder'?'folderFoot':'local')}</span></footer></main></div>`;}
function render(){const draft=$('#chat-message')?.value??'';const next=location.hash.slice(1)||'login';route=['login','signup','welcome','active','minimal'].includes(next)?next:'login';if(['welcome','active','minimal'].includes(route)&&!user){route='login';history.replaceState(null,'','#login');}if(['active','minimal'].includes(route)&&!personal.sessionStarted){route='welcome';history.replaceState(null,'','#welcome');}if(!['active','minimal'].includes(route)||personal?.workSession?.status!=='active'||demoState)camera.stop();document.title=`Rest Time${route==='minimal'?' · '+t('minimalTitle'):route==='active'?' · '+t('focusTitle'):''}`;document.documentElement.lang=currentLanguage()==='en'?'en':'zh-CN';app.innerHTML=route==='signup'?auth(true):route==='login'?auth():route==='welcome'?welcome():workspace();if($('#chat-message'))$('#chat-message').value=draft;updateClock();renderCharts();updateCameraStatus();if(chatOpen){const box=$('#chat-messages');if(box)box.scrollTop=box.scrollHeight;}}
function duration(ms){const sec=Math.max(0,Math.floor(ms/1000));return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(v=>String(v).padStart(2,'0'));}
function updateClock(){if(!personal)return;const date=new Date();const current=[date.getHours(),date.getMinutes(),date.getSeconds()].map(v=>String(v).padStart(2,'0'));const elapsed=duration(sessionNow()-(personal.sessionStarted??sessionNow()));for(const kind of ['current','elapsed']){const node=$(`[data-time="${kind}"]`);if(node){const values=kind==='current'?current:elapsed;node.innerHTML=`${values[0]}:${values[1]}<span class="seconds">${values[2]}</span>`;}}}
function timeLabel(timestamp){return new Date(timestamp).toLocaleTimeString(lang(),{hour:'2-digit',minute:'2-digit',hour12:false});}
function chartWindow(){const newest=personal.samples.at(-1);const end=newest?Date.parse(newest.timestamp):Date.now();return {end,start:end-range*60_000};}
function renderCharts(){if(!personal||route!=='active')return;const {end,start}=chartWindow();for(const kind of ['camera','wrist']){const node=$(`[data-chart="${kind}"]`);if(!node)continue;const key=kind==='camera'?'camera_index':'wrist_index';const rows=personal.samples.filter(r=>Date.parse(r.timestamp)>=start&&Date.parse(r.timestamp)<=end);const valid=rows.filter(r=>r[key]!==null);const color=kind==='camera'?'#3979ed':'#1ba1a6';const x=ts=>38+(Date.parse(ts)-start)/(end-start)*468;const y=v=>114-v/100*99;let segments=[],segment=[];for(const row of rows){if(row[key]===null){if(segment.length)segments.push(segment);segment=[];}else segment.push([x(row.timestamp),y(row[key])]);}if(segment.length)segments.push(segment);const grid=[0,25,50,75,100].map(v=>`<line x1="38" x2="506" y1="${y(v)}" y2="${y(v)}" stroke="#eaf0f7" ${v>0&&v<100?'stroke-dasharray="3 4"':''}/><text x="27" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');const ticks=[0,1,2,3].map(i=>{const stamp=start+(end-start)*i/3;return `<text x="${38+468*i/3}" y="138" text-anchor="${i===0?'start':i===3?'end':'middle'}">${timeLabel(stamp)}</text>`;}).join('');const areas=segments.filter(s=>s.length>1).map(s=>`<path d="M${s[0][0]},114 L${s.map(p=>p.join(',')).join(' L')} L${s.at(-1)[0]},114Z" fill="url(#fill-${kind})"/>`).join('');const lines=segments.map(s=>`<path d="M${s.map(p=>p.join(',')).join(' L')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`).join('');const last=valid.at(-1);const lastRow=rows.at(-1);node.innerHTML=`<defs><linearGradient id="fill-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".14"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${grid}${ticks}${areas}${lines}${last?`<circle cx="${x(last.timestamp)}" cy="${y(last[key])}" r="6" fill="${color}" opacity=".12"/><circle cx="${x(last.timestamp)}" cy="${y(last[key])}" r="3" fill="${color}" stroke="#fff" stroke-width="1.5"/>`:''}<line data-crosshair x1="0" x2="0" y1="15" y2="114" stroke="${color}" stroke-dasharray="3 3" opacity="0"/>`;
 const current=lastRow?.[key];$(`[data-score="${kind}"]`).innerHTML=`${current!=null?current.toFixed(0):'—'}<span>%</span>`;$(`[data-empty="${kind}"]`).hidden=Boolean(valid.length);$(`[data-last="${kind}"]`).textContent=lastRow?`${timeLabel(lastRow.timestamp)}${current==null?' · '+t('missing'):''}`:t('noSource');
 node.onpointermove=(event)=>{if(!rows.length)return;const rect=node.getBoundingClientRect();const requested=start+Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*520-38)/468))*(end-start);const point=rows.reduce((a,b)=>Math.abs(Date.parse(a.timestamp)-requested)<Math.abs(Date.parse(b.timestamp)-requested)?a:b);const tooltip=$(`[data-tooltip="${kind}"]`);tooltip.hidden=false;tooltip.innerHTML=`${timeLabel(point.timestamp)}<br/><strong>${point[key]!=null?point[key].toFixed(1)+'%':t('missing')}</strong>`;tooltip.style.left=`${Math.min(rect.width-105,Math.max(12,(x(point.timestamp)/520)*rect.width-43))}px`;tooltip.style.top='15px';const cross=$('[data-crosshair]',node);cross.setAttribute('x1',x(point.timestamp));cross.setAttribute('x2',x(point.timestamp));cross.setAttribute('opacity','.35');};node.onpointerleave=()=>{$(`[data-tooltip="${kind}"]`).hidden=true;$('[data-crosshair]',node).setAttribute('opacity','0');};
}}
function openHelp(){dialog(t('help'),`<div class="help-block"><h3>${t('camera')} & ${t('wrist')}</h3><button class="text-button" data-action="camera-settings">${t('cameraSetup')}</button><p class="modal-text">${t('helpText')}</p><div class="help-action"><button class="secondary" data-action="data">${t('data')}</button><button class="secondary" data-action="demo">${t('demo')}</button></div></div><div class="help-block"><h3>${t('assistant')}</h3><button class="text-button" data-action="ai-settings">${t('aiSettings')}</button><p class="modal-text">${t('chatBody')}</p></div><div class="help-block"><h3>${t(storage.status().mode==='folder'?'folderTitle':'local')}</h3><p class="modal-text">${t(storage.status().mode==='folder'?'folderInfo':'server')}</p>${storage.status().mode==='folder'?`<p class="modal-text folder-path">${t('folderLocation')}：${escape(storage.status().name)} / rest-time-data</p><div class="help-action"><button class="secondary" data-action="connect-folder">${t('reconnectFolder')}</button></div>`:''}</div>`);}
function openData(){const example={window_end_utc:new Date().toISOString(),camera_result:{valid:true,need_rest_probability_percent:25,quality_score:0.9},physiology_result:{valid:true,need_rest_probability_percent:32,quality_score:0.9}};dialog(t('data'),`<p class="modal-text">${t('dataText')}</p><textarea class="modal-data" id="data-input" aria-label="${t('analysisJSON')}" spellcheck="false" placeholder="${escape(JSON.stringify(example,null,2))}">${demoState?escape(JSON.stringify(demoWindows(demoState.base).slice(0,Math.max(1,demoState.index)),null,2)):personal.samples.length?escape(JSON.stringify({samples:personal.samples.slice(-60)},null,2)):''}</textarea><p class="form-error" id="data-error" role="alert"></p><p class="modal-text">${personal.samples.length} ${t('displayed')}</p>`,`<button class="secondary" data-action="close-modal">${t('close')}</button><button class="primary" data-action="import">${t('import')}</button>`);}
async function authenticate(form){
 const data=new FormData(form),signup=form.dataset.signup==='true',submit=$('[type=submit]',form);$('#auth-error').textContent='';
 if(!data.get('identity').trim()||!data.get('password')||(signup&&(!data.get('name').trim()||!data.get('confirm')))){$('#auth-error').textContent=t('allFields');return;}
 if(String(data.get('password')).length<8||String(data.get('password')).length>128){$('#auth-error').textContent=t('passwordLength');return;}
 if(String(data.get('identity')).length>120||String(data.get('name')??'').length>120){$('#auth-error').textContent=t('fieldLength');return;}
 if(signup&&data.get('password')!==data.get('confirm')){$('#auth-error').textContent=t('passwordMismatch');return;}
 submit.disabled=true;
 try{
  await storage.authorize();folderReady=await storage.ready();user=signup?await storage.signup(data.get('name'),data.get('identity'),data.get('password')):await storage.login(data.get('identity'),data.get('password'));personal=await storage.personal(user.id);
  // A new account inherits the selected interface language; otherwise use its saved choice.
  if(signup)personal.language=uiLanguage;
  sessionStorage.setItem('rt-user',JSON.stringify(user));personal.sessionStarted=null;await save();rememberLanguage();chatOpen=false;setRoute('welcome');
 }catch(error){user=null;personal=null;sessionStorage.removeItem('rt-user');$('#auth-error').textContent=errorText(error);}finally{submit.disabled=false;}
}
async function sendMessage(){const input=$('#chat-message');const content=input.value.trim();if(!content||aiBusy)return;input.value='';personal.messages.push({role:'user',content,sessionId:personal.workSession.id,timestamp:new Date().toISOString()});await save();await runAI(personal.workSession.status==='awaiting_wrapup'?'summary':'message',content);}
function enableAudio(){if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}
function chime(){if(!personal.sound||!audio)return;try{for(const [i,f] of [740,988].entries()){const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=f;const start=audio.currentTime+i*.15;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.075,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.32);osc.start(start);osc.stop(start+.34);}}catch{}}
async function observe(){if(!user||document.hidden||!['active','minimal'].includes(route)||personal.workSession?.status!=='active'||aiBusy||Date.now()<nextObserve)return;camera.flush();nextObserve=Date.now()+60000;if(!demoState&&bridgeReady())await runAI('observe');}
async function logout(){camera.stop();cancelAI();if(demoState){exitDemo();return;}if(personal){personal.sessionStarted=null;try{await save();}catch{}}rememberLanguage();user=null;personal=null;unread=false;chatOpen=false;sessionStorage.removeItem('rt-user');modal.close();setRoute('login');}
document.addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;if(['start','sound','chat'].includes(action)&&personal?.sound){try{enableAudio();}catch{}}try{switch(action){case 'close-modal':modal.close();break;case 'camera-settings':openCamera();break;case 'camera-enable':if(demoState||personal?.workSession?.status!=='active'||!['active','minimal'].includes(route)){notify(t(demoState?'cameraDemo':'cameraSessionOnly'));break;}try{await camera.start(personal.workSession);updateCameraStatus();}catch(e){notify(errorText(e));updateCameraStatus();}break;case 'camera-disable':camera.stop();updateCameraStatus();break;case 'connect-folder':if(user&&storage.status().mode!=='folder'){unavailable(t('folderLogoutFirst'));break;}await storage.connectFolder();folderReady=await storage.ready();if(modal.open)modal.close();render();notify(t('folderSaved'));break;case 'change-folder':if(user){unavailable(t('folderLogoutFirst'));break;}await storage.connectFolder(true);folderReady=await storage.ready();render();notify(t('folderSaved'));break;case 'browser-storage':if(user){unavailable(t('folderLogoutFirst'));break;}await storage.useBrowser();folderReady=false;render();notify(t('browserSelected'));break;case 'show-password':{const input=$('#'+button.dataset.target);input.type=input.type==='password'?'text':'password';button.setAttribute('aria-label',t(input.type==='password'?'showPassword':'hidePassword'));break;}case 'forgot':unavailable(t('forgot'));break;case 'jd':unavailable(t('jd'));break;case 'start':await startSession();break;case 'end-session':await endSession();break;case 'summarize':await runAI('summary');break;case 'new-session':camera.stop();cancelAI();personal.sessionStarted=null;await save();setRoute('welcome');break;case 'retry-ai':if(lastAIRequest)await runAI(...lastAIRequest);break;case 'ai-settings':openAISettings();break;case 'demo-source':dialog(t('demoSource'),`<p class="modal-text">${t('demoText')}</p><p class="modal-text">Hamann &amp; Carstengerdes · Scientific Reports 13, 4738 (2023). <a href="https://doi.org/10.1038/s41598-023-31264-w" target="_blank" rel="noopener">Figure 1a</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></p>`);break;case 'demo-pause':demoState.paused=!demoState.paused;render();break;case 'demo-step':stepDemo();break;case 'demo-exit':exitDemo();break;case 'mode':setRoute(route==='minimal'?'active':'minimal');break;case 'chat':chatOpen=!chatOpen;if(chatOpen)unread=false;render();if(chatOpen)$('#chat-message')?.focus();break;case 'sound':personal.sound=!personal.sound;if(personal.sound){try{enableAudio();}catch{}}await save();render();notify(t(personal.sound?'soundOn':'soundOff'));break;case 'language':dialog(t('selectLanguage'),`<div class="language-options"><button data-action="set-language" data-language="zh" class="${currentLanguage()==='zh'?'selected':''}">简体中文</button><button data-action="set-language" data-language="en" class="${currentLanguage()==='en'?'selected':''}">English</button></div>`);break;case 'set-language':if(personal){personal.language=button.dataset.language;await save();}else uiLanguage=button.dataset.language;rememberLanguage();modal.close();render();break;case 'help':openHelp();break;case 'demo':startDemo();break;case 'data':openData();break;case 'import':try{const incoming=normalizeBatch(JSON.parse($('#data-input').value));personal.samples=mergeSamples(personal.samples,incoming);await save();modal.close();renderCharts();notify(t('importDone'));}catch(e){$('#data-error').textContent=`${t('invalid')}: ${errorText(e)}`;}break;case 'logout':dialog(t('logoutTitle'),`<p class="modal-text">${t('logoutText')}</p>`,`<button class="secondary" data-action="close-modal">${t('cancel')}</button><button class="primary" data-action="confirm-logout">${t('finish')}</button>`);break;case 'confirm-logout':case 'logout-welcome':await logout();break;}}catch(error){if(error.name!=='AbortError')dialog(t('folderTitle'),`<p class="modal-text">${escape(errorText(error))}</p>`);}});
document.addEventListener('submit',event=>{if(event.target.id==='auth-form'){event.preventDefault();authenticate(event.target);}if(event.target.id==='chat-form'){event.preventDefault();sendMessage(event.target);}});
document.addEventListener('change',event=>{if(event.target.dataset.range){range=Number(event.target.value);for(const select of document.querySelectorAll('[data-range]'))select.value=range;renderCharts();}});
document.addEventListener('keydown',event=>{if(event.target.id==='chat-message'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.target.form.requestSubmit();}});
modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});
window.addEventListener('pagehide',()=>camera.stop());
window.addEventListener('hashchange',()=>{render();observe();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateClock();renderCharts();observe();}});
setInterval(()=>{updateClock();observe();},1000);setInterval(()=>{if(demoState&&!demoState.paused&&personal?.workSession?.status==='active'&&demoState.index<DEMO_MINUTES)stepDemo();},2000);setInterval(()=>{renderCharts();observe();},config.refreshMs);
try{await storage.init();folderReady=await storage.ready();const remembered=JSON.parse(sessionStorage.getItem('rt-user')??'null');if(remembered&&folderReady){user=await storage.account(remembered.id);if(user)personal=await storage.personal(user.id);}}catch{sessionStorage.removeItem('rt-user');}
if(personal)rememberLanguage();
render();observe();
if(document.modelContext?.registerTool){for(const tool of [
 {name:'read_rest_time_session',description:'Read the current Rest Time session timer and the two chart series.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({signedIn:Boolean(user),mode:route,workSeconds:personal?.sessionStarted?Math.max(0,Math.floor((sessionNow()-personal.sessionStarted)/1000)):0,samples:personal?.samples??[]})},
 {name:'set_rest_time_view',description:'Switch an active focus session between full and minimal views.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['active','minimal']}},required:['mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||!['active','minimal'].includes(input.mode))throw new Error('Invalid view.');if(!user||!personal.sessionStarted)throw new Error('Start a session first.');history.replaceState(null,'','#'+input.mode);render();return {mode:route};}},
]){try{await document.modelContext.registerTool(tool);}catch{}}}

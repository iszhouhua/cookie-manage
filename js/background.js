chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    "id": "copyCookie",
    "title": "复制cookie",
    "contexts": ["page"]
  });
  chrome.contextMenus.create({
    "id": "pushCookie",
    "title": "推送cookie",
    "contexts": ["page"]
  });
  chrome.contextMenus.create({
    "id": "clearCookie",
    "title": "清除cookie",
    "contexts": ["page"]
  });
});


let getCurrentTab = async () => {
  let queryOptions = {
    active: true,
    currentWindow: true
  };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

let spliceCookies = (cookies) => {
  return cookies.map(c => c.name + '=' + c.value).join('; ')
}

let copyCookies = (cookies) => {
  chrome.scripting.executeScript({
    target: {
      tabId: tag.id
    },
    func: (val) => navigator.clipboard.writeText(val),
    args: [spliceCookies(cookies)]
  }, () => {
    console.log('cookie复制成功')
  });
}

let pushCookies = (cookies) => {
  chrome.storage.sync.get(['url', 'method', 'fieldName', 'cookieFormat', 'cookieNames'], config => {
    if (!config.url) {
      chrome.notifications.create("fail", {
        type: "basic",
        title: "Cookie推送工具",
        message: "cookie推送失败，未配置服务器信息。",
        iconUrl: "../images/fail.png"
      })
      return
    }
    let data = {}
    switch (config.cookieFormat) {
      case 'string':
        data[config.fieldName] = spliceCookies(cookies)
        break;
      case 'array':
        data[config.fieldName] = cookies.map(c => c.name + '=' + c.value)
        break;
      case 'object':
        let obj = {}
        for (const cookie of cookies) {
          obj[cookie.name] = cookie.value
        }
        data[config.fieldName] = obj
        break;
      default:
        data[config.fieldName] = cookies
        break;
    }

    console.log("推送url:", config.url, "推送数据:", data)

    fetch(config.url, {
      method: config.method,
      headers: {
        "Content-type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(data),
    }).then(response => {
      if (!response.ok) {
        chrome.notifications.create("fail", {
          type: "basic",
          title: "Cookie推送工具",
          message: "cookie推送失败，状态码：" + response.status,
          iconUrl: "../images/fail.png"
        })
      }
      response.text().then(text => {
        console.log("返回结果", text)
      })
    }, err => {
      console.error("请求失败", err);
      chrome.notifications.create("fail", {
        type: "basic",
        title: "Cookie推送工具",
        message: "cookie推送失败，" + err.message,
        iconUrl: "../images/fail.png"
      })
    });
  })
}

let removeCookies = (cookies, url) => {
  for (const cookie of cookies) {
    chrome.cookies.remove({
      name: cookie.name,
      url
    })
  }
}

chrome.contextMenus.onClicked.addListener(async (itemData) => {
  let tag = await getCurrentTab();
  let cookies = await chrome.cookies.getAll({
    url: tag.url
  })
  switch (itemData.menuItemId) {
    case 'copyCookie':
      copyCookies(cookies)
      break;
    case 'pushCookie':
      pushCookies(cookies)
      break;
    case 'clearCookie':
      removeCookies(cookies, tag.url)
      break;
  }
});

let lastAutoPushTime

let cookieListener = (changeInfo) => {
  if (changeInfo.removed) {
    //过滤删除cookie的操作
    return
  }
  chrome.storage.sync.get(['listenerDomain', 'minPushInterval', 'cookieNames'], async (config) => {
    if (changeInfo.cookie.domain.indexOf(config.listenerDomain) == -1) {
      //与监控域名不符，不推送
      return
    }
    if (config.cookieNames.length > 0 && config.cookieNames.indexOf(changeInfo.cookie.name) == -1) {
      //不在监控的cookie名称之中，不推送
      return
    }
    const timeInMs = Date.now()
    if (lastAutoPushTime && (timeInMs - lastAutoPushTime) / 1000 < config.minPushInterval) {
      //还没到最短间隔时长，不推送
      return
    }
    lastAutoPushTime = timeInMs
    let cookies = await chrome.cookies.getAll({
      domain: config.listenerDomain
    })
    pushCookies(cookies)
  });
}

chrome.storage.sync.get(['isAutoPush'], (result) => {
  if (result.isAutoPush) {
    chrome.cookies.onChanged.addListener(cookieListener)
  }
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isAutoPush) {
    let newVal = changes.isAutoPush.newValue
    if (newVal) {
      chrome.cookies.onChanged.addListener(cookieListener)
    } else {
      chrome.cookies.onChanged.removeListener(cookieListener)
    }
  }
})
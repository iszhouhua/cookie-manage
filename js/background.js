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

let copyCookies = (tag, cookies) => {
  const cookieStr = spliceCookies(cookies)
  chrome.scripting.executeScript({
    target: {
      tabId: tag.id
    },
    func: (val) => navigator.clipboard.writeText(val),
    args: [cookieStr]
  }, () => {
    console.log('cookie复制成功', cookieStr)
    chrome.notifications.create({
      type: "basic",
      title: "cookie复制成功",
      message: "cookie已成功复制到剪切板",
      iconUrl: "/images/icon-128.png"
    })
  });
}

let pushCookies = (cookies) => {
  chrome.storage.sync.get(['url', 'method', 'fieldName', 'fieldLocation'], config => {
    if (!config.url) {
      chrome.notifications.create({
        type: "basic",
        title: "cookie推送失败",
        message: "未配置服务器信息",
        iconUrl: "/images/icon-128.png"
      })
      return
    }
    let cookieStr = spliceCookies(cookies)
    console.log("推送配置", config)
    console.log("推送cookie", cookieStr)
    let request;
    switch (config.fieldLocation) {
      case 'header':
        let headers = {}
        headers[config.fieldName] = cookieStr
        request = fetch(config.url, {
          method: config.method,
          headers
        })
        break;
      case 'url':
        request = fetch(`${config.url}?${config.fieldName}=${cookieStr}`, {
          method: config.method
        })
        break;
      case 'body':
        request = fetch(config.url, {
          method: config.method,
          headers: {
            "Content-type": "application/json;charset=UTF-8",
          },
          body: `{"${config.fieldName}":"${cookieStr}"}`,
        })
        break;
    }
    request.then(r => r.text()).then(text => {
      console.log("返回结果", text)
      chrome.notifications.create({
        type: "basic",
        title: "cookie推送结果",
        message: text,
        iconUrl: "/images/icon-128.png"
      })
    }, err => {
      console.error("请求失败", err);
      chrome.notifications.create({
        type: "basic",
        title: "cookie推送出错",
        message: err.message,
        iconUrl: "/images/icon-128.png"
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
  chrome.notifications.create({
    type: "basic",
    title: "cookie清除成功",
    message: "cookie已全部清空",
    iconUrl: "/images/icon-128.png"
  })
}

chrome.contextMenus.onClicked.addListener(async (itemData) => {
  let tag = await getCurrentTab();
  let cookies = await chrome.cookies.getAll({
    url: tag.url
  })
  switch (itemData.menuItemId) {
    case 'copyCookie':
      copyCookies(tag, cookies)
      break;
    case 'pushCookie':
      pushCookies(cookies)
      break;
    case 'clearCookie':
      removeCookies(cookies, tag.url)
      break;
  }
});

var lastAutoPushTime

let cookieListener = (changeInfo) => {
  if (changeInfo.removed) {
    //过滤删除cookie的操作
    return
  }
  chrome.storage.sync.get(['listenerUrl', 'minPushInterval', 'cookieNames'], async (config) => {
    if (!config.cookieNames.includes(changeInfo.cookie.name)) {
      //不在监控的cookie名称之中，不推送
      return
    }
    const topDomain = changeInfo.cookie.domain.split('.').slice(-2).join('.');
    if (!config.listenerUrl.includes(topDomain)) {
      //不在同一域名下，不推送
      return
    }
    const timeInMs = Date.now()
    if (lastAutoPushTime && (timeInMs - lastAutoPushTime) / 1000 < config.minPushInterval) {
      //还没到最短间隔时长，不推送
      return
    }
    lastAutoPushTime = timeInMs
    setTimeout(function () {
      //延迟3秒再推送(网站可能一次性设置了很多cookie，立即获取得到的cookie可能不完整)
      chrome.cookies.getAll({
        url: config.listenerUrl
      },cookies=>pushCookies(cookies))
  }, 3000);
  });
}

chrome.storage.sync.get(['isAutoPush'], (result) => {
  if (result.isAutoPush) {
    console.log('开始监听cookie')
    chrome.cookies.onChanged.addListener(cookieListener)
  }
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isAutoPush) {
    let newVal = changes.isAutoPush.newValue
    if (newVal) {
      console.log('开始监听cookie')
      chrome.cookies.onChanged.addListener(cookieListener)
    } else {
      console.log('取消监听cookie')
      chrome.cookies.onChanged.removeListener(cookieListener)
    }
  }
})
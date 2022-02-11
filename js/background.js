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
layui.use(['notify', 'jquery', 'xmSelect'], function () {
  var form = layui.form,
    layer = layui.layer,
    notify = layui.notify,
    $ = layui.jquery,
    xmSelect = layui.xmSelect;
    var cookieSelect = xmSelect.render({
      el: '#cookieNames',
      name: 'cookieNames',
      tips: '请选择需要监控的Cookie',
      empty: '请先输入需要监控的URL',
      layVerType: 'tips',
      autoRow: true,
      filterable: true,
      data: []
    })

  chrome.storage.sync.get(null, function (result) {
    form.val("configForm", result);
    switchIsAutoPush(result.isAutoPush)
    let selectData = []
    for (const cookieName of result.cookieNames) {
      selectData.push({ name: cookieName, value: cookieName, selected: true })
    }
    cookieSelect.update({
      data: selectData
    })
  });

  let switchIsAutoPush = (isAutoPush) => {
    let autoPushConfig = $('#autoPushConfigView')
    if (isAutoPush) {
      autoPushConfig.removeClass('layui-hide')
      autoPushConfig.find('input.layui-input').attr("lay-verify", "required")
      autoPushConfig.find('input.xm-select-default').attr("lay-verify", "required")
    } else {
      autoPushConfig.addClass('layui-hide')
      autoPushConfig.find('input.layui-input').removeAttr("lay-verify")
      autoPushConfig.find('input.xm-select-default').removeAttr("lay-verify")
    }
  }
  form.on('switch(isAutoPush)', function () {
    switchIsAutoPush(this.checked)
  });

  $("#listenerUrl").blur(function () {
    let value = $(this).val()
    if (!isUrl(value)) {
      layer.tips('请输入正确的URL', '#listenerUrl');
      cookieSelect.update({
        data: []
      })
      return
    }
    chrome.cookies.getAll({
      url: value
    }, cookies => {
      if (!cookies || !cookies.length) {
        layer.tips('该URL下无任何cookie', '#listenerUrl');
      }
      let newData = []
      for (const cookie of cookies) {
        newData.push({ name: cookie.name, value: cookie.name })
      }
      cookieSelect.update({
        data: newData
      })
    })
  })

  form.on('submit(save)', function (obj) {
    let data = obj.field
    if(data.fieldLocation==="header"&&forbiddenRequestHeaders.includes(data.fieldName)){
      layer.tips('header传参不能使用此字段名', '#fieldName');
      return false;
    }
    if(data.fieldLocation==="body"&&data.method==="GET"){
      notify.error("使用GET方法的请求不能有body")
      return false;
    }
    data.isAutoPush = data.isAutoPush ? true : false
    if(data.cookieNames){
      data.cookieNames = data.cookieNames.split(',');
    }else{
      data.cookieNames = []
    }
    console.log(data)
    chrome.storage.sync.set(data, function () {
      notify.success("保存成功")
    });
    return false;
  });
});



var forbiddenRequestHeaders = [
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "content-transfer-encoding",
  "cookie",
  "cookie2",
  "date",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via"];

function isUrl(str) {
  var v = new RegExp('^(?!mailto:)(?:(?:http|https|ftp)://|//)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$', 'i');
  return v.test(str);
};
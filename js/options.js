layui.use(['notify', 'jquery'], function () {
  var form = layui.form,
    layer = layui.layer,
    notify = layui.notify,
    $ = layui.jquery;

  chrome.storage.sync.get(null, function (result) {
    form.val("configForm", result);
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
    "via"   ];

  $("#saveConfig").click(function () {
    let dataArray = $("#configForm").serializeArray();
    let data = {}
    $.each(dataArray, function () {
      data[this.name] = this.value;
    });
    if(data.fieldLocation==="header"&&forbiddenRequestHeaders.includes(data.fieldName)){
      layer.tips('header传参不能使用此字段名', '#fieldName');
      return
    }
    if(data.fieldLocation==="body"&&data.method==="GET"){
      notify.error("使用GET方法的请求不能有body")
      return
    }
    
    chrome.storage.sync.set(data, function () {
      notify.success("保存成功")
    });
  });
});
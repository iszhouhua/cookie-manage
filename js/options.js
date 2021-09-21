layui.use(['form', 'notify','inputTag', 'jquery'], function () {
  var form = layui.form,
    layer = layui.layer,
    notify = layui.notify, 
    $ = layui.jquery, 
    inputTag = layui.inputTag;
    
    let cookieNames = [];

  chrome.storage.sync.get(null, function (result) {
    form.val("configForm", result);
    switchIsAutoPush(result.isAutoPush)
    inputTag.render({
      elem: '.cookieNames',
      data: result.cookieNames,
      onChange: function (value) {
        cookieNames = value
      }
    });
  });


  let switchIsAutoPush = (isAutoPush)=>{
    let autoPushConfig = $('#autoPushConfigView')
    if (isAutoPush) {
      autoPushConfig.removeClass('layui-hide')
      autoPushConfig.find('input.layui-input').attr("lay-verify", "required")
    } else {
      autoPushConfig.addClass('layui-hide')
      autoPushConfig.find('input.layui-input').removeAttr("lay-verify")
    }
  }

  form.on('switch(isAutoPush)', function () {
    switchIsAutoPush(this.checked)
  });

  form.on('select(cookieFormat)', function (data) {
    switch (data.value) {
      case 'string':
        $('#cookieFormatTip').text('示例：a=1; b=2') 
        break;
      case 'array':
        $('#cookieFormatTip').text('示例：["a=1","b=2"]')
        break;
      case 'object':
        $('#cookieFormatTip').text('示例：{a:"1",b:"2"}')
        break;
      case 'jsonArray':
        $('#cookieFormatTip').text('示例：[{domain:".abc.com",name:"a",value:"1"},{domain:".abc.com",name:"b",value:"2"}]')
        break;
    }
  });

  $("#listenerDomain").blur(function () {
    let value = $(this).val()
    if (!value) return
    let domain = tldjs.getDomain(value)
    $(this).val(domain)
    if (!domain) {
      layer.tips('非法域名', '#listenerDomain');
    }
  })

  form.on('submit(save)', function (data) {
    data.field.isAutoPush = data.field.isAutoPush ? true : false
    data.field.cookieNames = cookieNames
    chrome.storage.sync.set(data.field, function () {
      notify.success("保存成功")
    });
    return false;
  });
});
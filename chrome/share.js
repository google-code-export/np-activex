function initShare() {
  var link = "https://chrome.google.com/webstore/detail/lgllffgicojgllpmdbemgglaponefajn"
    var text2 = ['Chrome也能用网银啦！',
      '每次付款还要换浏览器？你out啦！',
      '现在可以彻底抛弃IE了！',
      '让IE去死吧！',
      'Chrome用网银'
  ];
  text2 = text2[parseInt(Math.random() * 1000121) %  text2.length];
  text2 += "只要安装了ActiveX for Chrome，就可以直接在Chrome里使用各种网银、播放器等ActiveX控件了。而且不用切换内核，非常方便。";

  var pic = 'http://ww3.sinaimg.cn/bmiddle/8c75b426jw1dqz2l1qfubj.jpg';
  var text = text2 + "下载地址：";



  // facebook
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/all.js#xfbml=1";
      js.async = true;
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  window.___gcfg = {lang: navigator.language};

  // Google plus
  (function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/plusone.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();


  // Sina weibo
  (function(){
    var _w = 75 , _h = 24;
    var param = {
      url:link,
      type:'2',
      count:'1', /**是否显示分享数，1显示(可选)*/
      appkey:'798098327', /**您申请的应用appkey,显示分享来源(可选)*/
      title:text,
      pic:pic, /**分享图片的路径(可选)*/
      ralateUid:'2356524070', /**关联用户的UID，分享微博会@该用户(可选)*/
      language:'zh_cn', /**设置语言，zh_cn|zh_tw(可选)*/
      rnd:new Date().valueOf()
    }
    var temp = [];
    for( var p in param ){
      temp.push(p + '=' + encodeURIComponent( param[p] || '' ) )
    }
    weiboshare.innerHTML = ('<iframe allowTransparency="true" frameborder="0" scrolling="no" src="http://hits.sinajs.cn/A1/weiboshare.html?' + temp.join('&') + '" width="'+ _w+'" height="'+_h+'"></iframe>')
  })();


  //renren
  function shareClick() {
    var rrShareParam = {
      resourceUrl : link,	//分享的资源Url
      pic : pic,		//分享的主题图片Url
      title : 'Chrome用网银:ActiveX for Chrome',		//分享的标题
        description : text2	//分享的详细描述
    };
    rrShareOnclick(rrShareParam);
  }
  Renren.share();
  xn_share.addEventListener("click", shareClick, false);

  // Tencent weibo
  function postToWb(){
    var _url = encodeURIComponent(link);
    var _assname = encodeURI("");//你注册的帐号，不是昵称
    var _appkey = encodeURI("801125118");//你从腾讯获得的appkey
    var _pic = encodeURI(pic);//（例如：var _pic='图片url1|图片url2|图片url3....）
    var _t = '';//标题和描述信息
    var metainfo = document.getElementsByTagName("meta");
    for(var metai = 0;metai < metainfo.length;metai++){
      if((new RegExp('description','gi')).test(metainfo[metai].getAttribute("name"))){
        _t = metainfo[metai].attributes["content"].value;
      }
    }
    _t =  text;
    if(_t.length > 120){
      _t= _t.substr(0,117)+'...';
    }
    _t = encodeURI(_t);

    var _u = 'http://share.v.t.qq.com/index.php?c=share&a=index&url='+_url+'&appkey='+_appkey+'&pic='+_pic+'&assname='+_assname+'&title='+_t;
      window.open( _u,'', 'width=700, height=680, top=0, left=0, toolbar=no, menubar=no, scrollbars=no, location=yes, resizable=no, status=no' );
  }
  qqweibo.addEventListener('click', postToWb, false);

  // Douban
  function doubanShare() {
    var d = document,
    e = encodeURIComponent,
    s1 = window.getSelection,
    s2 = d.getSelection,
    s3 = d.selection,
    s = s1 ? s1() : s2 ? s2() : s3 ? s3.createRange().text: '',
    r = 'http://www.douban.com/recommend/?url=' + e(link) + '&title=' + e('ActiveX for Chrome') + '&sel=' + e(s) + '&v=1';
        var x = function() {
      if (!window.open(r, 'douban', 'toolbar=0,resizable=1,scrollbars=yes,status=1,width=450,height=330')) 
        location.href = r + '&r=1'
    };
    if (/Firefox/.test(navigator.userAgent)) {
      setTimeout(x, 0)
    } else {
      x()
    }
  };

  doubanshare.addEventListener('click', doubanShare, false);
};

$(document).ready(function() {
  div = $('#share');
  div.load('share.html', function() {
    setTimeout(initShare, 200);
  });
});
document.write('<script type="text/javascript" src="rrshare.js"></script>');
document.write('<div id="share">');
document.write('</div>');

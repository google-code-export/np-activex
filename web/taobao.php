<?php
function load() {
  header('Content-Type: text/text; charset=GBK');
  $code = $_GET['code'];
  if ($code == "") {
    header('Location: https://oauth.taobao.com/authorize?response_type=code&redirect_uri=http://eagleonhill.oicp.net/editor/taobao.php&client_id=21134472');
  } else {
    chdir('../../donation-dir');
    echo passthru('taobao.bat "' . $code . '"');
  }
}
load();
?>

<?php
function load() {
  header('Content-Type: text/text; charset=UTF-8');
  $code = $_GET['code'];
  chdir('../../donation-dir');
  if ($code == "") {
    $appkeyid = exec('taobao_keyid.bat');
    header('Location: https://oauth.taobao.com/authorize?response_type=code&redirect_uri=http://eagleonhill.oicp.net/editor/taobao.php&client_id=' . $appkeyid);
  } else {
    echo passthru('taobao.bat "' . $code . '"');
  }
}
load();
?>

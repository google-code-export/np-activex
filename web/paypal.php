<?php
function load() {
  $postData = '';
  foreach ($_POST as $key => $value) {
    $value = urlencode(stripslashes($value));
    $postData .= "&$key=$value";
  }
  $postData = substr($postData, 1);

  if (!isset($_POST['item_number']) || $_POST['item_number'] != 'npax') {
    echo 'Not relevant item';
    return;
  }
  chdir('../../donation-dir');
  echo exec('paypal.bat "' . $postData . '"');
}
load();
?>

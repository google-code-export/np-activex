import urllib
import urllib2
import argparse
import sys
from log import Logger
from datetime import datetime, timedelta

def verify_order(postdata, sandbox):
  data = 'cmd=_notify-validate&' + postdata
  if sandbox:
    scr = 'https://www.sandbox.paypal.com/cgi-bin/websc'
  else:
    scr = 'https://www.paypal.com/cgi-bin/websc'
  res = urllib2.urlopen(scr, data).read()
  if res == 'VERIFIED':
    return True
  return False

def convert_order(item):
  value = {}
  value['name'] = item['address_name']
  value['mail'] = item['payer_email']
  value['nickname'] = item['address_name']
  gross = float(item['mc_gross'])
  fee = float(item['mc_fee'])
  value['amount'] = gross
  value['actual_amount'] = gross - fee
  value['unit'] = 'USD'
  value['comment'] = ''
  value['time'] = datetime.strptime(
      item['payment_date'], '%H:%M:%S %b %d, %Y PDT') + timedelta(hours = 15)
  value['method'] = 'paypal'
  value['id'] = item['txn_id']
  return value


def get_order(postdata):
  fields = postdata.split('&')
  item = {}
  for field in fields:
    name, value = field.split('=')
    value = urllib.unquote_plus(value).decode('utf-8')
    item[name] = value
  return item

def main():
  parser = argparse.ArgumentParser()
  parser.add_argument('-l', '--log', dest='logfile', help='Logfile',
      required=True)
  parser.add_argument('-p', '--paypal', dest='paypal', help='Paypal input',
      required=True)
  args = parser.parse_args()

  item = get_order(args.paypal)
  if not verify_order(args.paypal, 'test_ipn' in item):
    print 'Error in verification'
    print args.paypal
    sys.exit(1)
  if item['payment_status'] != 'Completed':
    print 'Payment from ', item['address_name'], ' not completed ', item['txn_id']
    print args.paypal
    sys.exit(1)
  logitem = convert_order(item)
  
  logfile = args.logfile
  if 'test_ipn' in item:
    logfile = 'test'
  logger = Logger({'logfile': logfile})
  logger.log(logitem)
  logger.close()
  print 'Received payment from %s, txn_id=%s, amount=$%.2f, date=%s' % (
      logitem['name'], logitem['id'], logitem['amount'], item['payment_date'])

if __name__ == '__main__':
  main()

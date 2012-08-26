import top.api as topapi
import traceback
import log
import top
import json
import re
import webbrowser
import time
import urllib2
import cookielib
import urllib
import httplib
from ConfigParser import ConfigParser 
from datetime import datetime, timedelta

class T:
  def trace_exception(self, ex):
    print ex

common = T()

configfile = 'config'
class TaobaoBackground:
  def __init__(self, config):
    self.config = config
    self.onNewPaidOrder = []
    self.onConfirmedOrder = []
    self.retry = 1
    self.stream = None

  def get_permit(self):
    request = self.config.create_request(topapi.IncrementCustomerPermitRequest)
    request.session = self.config.session
    f = request.getResponse()
    print 'increment permit ', f

  def start_stream(self):
    site = self.config.stream_site

    data = {}
    data['app_key'] = self.config.appinfo.appkey
    time = datetime.utcnow()
    time += timedelta(hours = 8)
    data['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
    data['sign'] = top.sign(self.config.appinfo.secret, data)

    url = '/stream'
    self.connection = httplib.HTTPConnection(site, 80, timeout=60)
    self.connection.request('POST', url, urllib.urlencode(data), self.get_request_header())

    self.stream = self.connection.getresponse()

  def get_request_header(self):
      return {
               'Content-type': 'application/x-www-form-urlencoded',
               "Cache-Control": "no-cache",
               "Connection": "Keep-Alive",
      }
      
  def start(self):
    # get permit
    self.get_permit()
    self.start_stream()

  def getMessage(self):
    text = ''
    while True:
      char = self.stream.read(1)
      if char == '\r':
        continue
      if char == '\n':
        break
      text += char
    return json.loads(text)['packet']

  def run(self):
    self.start()
    while True:
      msg = self.getMessage()
      self.processMessage(msg)

  def processMessage(self, msg):
    if msg['code'] == 101:
      retry = 1
    elif msg['code'] == 102:
      retry = msg['msg']
    elif msg['code'] == 103:
      retry = msg['msg']
    elif msg['code'] == 200:
      print msg['msg']
    elif msg['code'] == 203:
      print 'Data lost'
      self.config.pull(msg['msg']['begin'] / 1000, msg['msg']['end'] / 1000)
    elif msg['code'] == 202:
      # data
      print msg['msg']

class TaobaoAx:
  def __init__(self, configParser, logger):
    self.session = None
    self.sessionTs = 0
    self.freq = 30
    self.configParser = configParser
    self._tradefields = 'buyer_nick,num_iid,status,pay_time,tid,payment,seller_rate,has_buyer_message,buyer_message,buyer_email,receiver_name'
    self.logger = logger

  def read_config(self):
    cp = self.configParser
    self.session = cp.get('taobao', 'session')
    self.sessionTs = cp.getfloat('taobao', 'expire')
    self.sessionTime = datetime.fromtimestamp(self.sessionTs)

    appkey = cp.get('taobao', 'appkey')
    secret = cp.get('taobao', 'appsecret')
    self.appinfo = top.appinfo(appkey, secret)
    self.site = cp.get('taobao', 'appsite')
    self.authurl = cp.get('taobao', 'auth_url')
    self.tokenurl = cp.get('taobao', 'token_url')
    self.stream_site = cp.get('taobao', 'stream_site')

    self.freq = cp.getint('taobao', 'freq');
    if self.sessionTime > datetime.now():
      print 'loaded session ', self.session

  def write_config(self):
    cp = self.configParser
    cp.set('taobao', 'session', self.session)
    cp.set('taobao', 'expire', self.sessionTs)
    cp.set('taobao', 'freq', self.freq);
    o = open(configfile, 'w')
    cp.write(o)
    o.close()

  def get_auth_code(self):
    url = self.authurl + str(self.appinfo.appkey)
    webbrowser.open(url)
    return raw_input("session authentication reqired:\n")

  def request_session(self):
    authcode = self.get_auth_code()
    authurl = self.tokenurl
    request = {}
    request['client_id'] = self.appinfo.appkey
    request['client_secret'] = self.appinfo.secret
    request['grant_type'] = 'authorization_code'
    request['code'] = authcode
    request['redirect_uri'] = 'urn:ietf:wg:oauth:2.0:oob'
    requeststr = urllib.urlencode(request)
    response = urllib2.urlopen(authurl, requeststr).read()
    response = json.loads(response)
    print response
    self.sessionTs = time.time() + response['expires_in']
    self.sessionTime = datetime.fromtimestamp(self.sessionTs)
    self.session = response['access_token']
    #self.write_config()

    nick = unicode(urllib2.unquote(str(response['taobao_user_nick'])), 'utf-8')
    print 'Login as ', nick

  def init(self):
    try:
      pass
    except:
      self.session = None

    self.read_config()

    if self.session == None or self.sessionTime < datetime.now():
      self.request_session()

  def send_good(self, order):
    request = self.create_request(topapi.LogisticsDummySendRequest)
    request.session = self.session
    request.tid = order['tid']
    result = request.getResponse()
    print 'send good: ', order['payment'], order['buyer_nick']

  def rate_order(self, order):
    request = self.create_request(topapi.TraderateAddRequest)
    request.session = self.session
    request.tid = order['tid']
    request.role = 'seller'
    request.flag = 2
    request.result = 'good'
    request.getResponse()
    print 'rate order: ', order['payment'], order['buyer_nick']

  def memo_order(self, order):
    request = self.create_request(topapi.TradeMemoUpdateRequest)
    request.session = self.session
    request.tid = order['tid']
    request.memo = 'Send by taobao.py'
    request.getResponse()

  def log_order(self, order):
    logitem = {}
    logitem['name'] = order['receiver_name']
    logitem['mail'] = order['buyer_email']
    logitem['nickname'] = order['buyer_nick']
    logitem['amount'] = float(order['payment'])
    logitem['actual_amount'] = float(order['payment'])
    logitem['unit'] = 'RMB'
    logitem['comment'] = order['buyer_message']
    logitem['time'] = order['pay_time']
    logitem['method'] = 'taobao'
    logitem['id'] = order['tid']
    self.logger.log(logitem)

  def process_order(self, orderid):
    try:
      order = self.get_full_info(orderid)
      if order['status'] == 'WAIT_SELLER_SEND_GOODS':
        self.send_good(order)
        self.memo_order(order)
        self.log_order(order)
      elif order['status'] == 'TRADE_FINISHED' and not order['seller_rate']:
        self.rate_order(order)
    except topapi.base.TopException as ex:
      traceback.print_exc()
      common.trace_exception(ex)
    except topapi.base.RequestException as ex:
      traceback.print_exc()
      common.trace_exception(ex)

  def get_paid_orders(self):
    request = self.create_request(topapi.TradesSoldGetRequest)
    request.session = self.session
    request.fields = 'tid'
    request.page_size = 100
    request.page_no = 1
    request.type = 'guarantee_trade'
    return self._load_all_orders(request)

  def _load_all_orders(self, request):
    request.use_has_next = True
    orders = []
    while True:
      f = request.getResponse()['trades_sold_get_response']
      if 'trades' in f:
        orders += f['trades']['trade']
      if f['has_next']:
        request.page_no += 1
      else:
        break
    return orders

  def get_wait_rate_orders(self):
    request = self.create_request(topapi.TradesSoldGetRequest)
    request.session = self.session
    request.fields = 'tid'
    request.status = 'TRADE_FINISHED'
    request.rate_status = 'RATE_UNSELLER'
    request.start_created = datetime.now() - timedelta(days = 21)
    request.end_created = datetime.now()
    request.page_size = 100
    request.type = 'guarantee_trade'
    return self._load_all_orders(request)

  def get_new_orders(self):
    request = self.create_request(topapi.TradesSoldGetRequest)
    request.session = self.session
    request.fields = 'tid'
    request.status = 'WAIT_SELLER_SEND_GOODS'
    request.start_created = datetime.now() - timedelta(days = 5)
    request.end_created = datetime.now()
    request.type = 'guarantee_trade'
    request.page_size = 100
    request.use_has_next = True
    return self._load_all_orders(request)

  def query_and_process_orders(self):
    new_orders = self.get_new_orders()
    unrated_orders = self.get_wait_rate_orders()
    for order in new_orders + unrated_orders:
      self.process_order(order['tid'])

  def run(self):
    while True:
      try:
        self.query_and_process_orders()
      except Exception, ex:
        if isinstance(ex, top.api.base.TopException):
          if ex.subcode == 'isv.trade-service-rejection':
            print 'Error: isv.trade-service-rejection, pause 3 minutes'
            time.sleep(3 * 60)
        traceback.print_exc()
        common.trace_exception(ex)
      #time.sleep(self.freq)
      raw_input()

  def get_full_info(self, tradeid):
    request = self.create_request(topapi.TradeFullinfoGetRequest)
    request.session = self.session
    request.fields = self._tradefields
    request.tid = tradeid
    trade = request.getResponse()['trade_fullinfo_get_response']['trade']
    if not 'buyer_message' in trade:
      trade['buyer_message'] = u''
    if not 'buyer_email' in trade:
      trade['buyer_email'] = u''
    if 'pay_time' in trade:
      trade['pay_time'] = datetime.strptime(
          trade['pay_time'], '%Y-%m-%d %H:%M:%S')
    else:
      trade['pay_time'] = datetime.fromtimestamp(0)
    return trade

  def make_record(self):
    trades = self.get_paid_orders()
    f = open('trades.csv', 'w')
    print >>f, self._tradefields
    fields = self._tradefields.split(',')
    trades.reverse()
    sum = 0
    for tradeid in trades:
      trade = self.get_full_info(tradeid['tid'])
      if trade['status'] not in ['WAIT_BUYER_PAY', 'TRADE_CLOSED_BY_TAOBAO']:
        newtrade = dict(trade)
        newtrade.setdefault('pay_time', '')
        newtrade['tid'] = '="%s"' % trade['tid']
        newtrade['num_iid'] = '="%s"' % trade['num_iid']
        items = [newtrade.get(field, '') for field in fields]
        for i in range(len(items)):
          if not isinstance(items[i], basestring):
            items[i] = str(items[i])
        s = u','.join(items)
        sum += float(trade['payment'])
        print >>f, s.encode('gbk')
    f.close()
    print 'Total: ', sum

  def run_background(self):
    runner = TaobaoBackground(self)
    runner.onNewPaidOrder += [self.on_new_order]
    runner.onConfirmedOrder += [self.on_confirmed_order]
    runner.run()

  def on_confirmed_order(self, order):
    self.evaluate_buyer(order)

  def on_new_order(self, order):
    self.process_order(order['tid'])

  def create_request(self, requestType):
    val = requestType(self.site, 80)
    val.set_app_info(self.appinfo)
    return val

def main():
  cp = ConfigParser()
  cp.read(configfile)
  logger = log.Logger({'logfile': cp.get('log', 'logfile')})
  instance = TaobaoAx(cp, logger)
  instance.read_config()
  instance.init()
  instance.query_and_process_orders()

if __name__ == '__main__':
  main()

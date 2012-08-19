import threading
import os
import csv
import argparse
from datetime import datetime

class Logger:
  fields = ['name', 'mail', 'nickname', 'amount', 'actual_amount', 'unit',\
      'comment', 'time', 'method', 'id']

  def __init__(self, config):
    logfile = config['logfile']
    self.path = logfile + '.csv'
    self.amount_file = logfile + '.sum'
    self._file = open(self.path, 'ab', 1)
    self._writer = csv.DictWriter(self._file, Logger.fields)
    self._sum_lock = threading.RLock()
    self.lock = threading.RLock()
    try:
      timestamp = os.stat(self.amount_file).st_mtime
    except Exception as ex:
      with open(self.amount_file, 'w') as f:
        print '0\n0\n0' > f
      timestamp = os.stat(self.amount_file).st_mtime
    self.lastupdate = datetime.fromtimestamp(timestamp)

  def log(self, item):
    with self.lock:
      s = dict(item)
      s['time'] = s['time'].strftime('%Y/%m/%d %H:%M:%S')
      for i in s:
        if isinstance(s[i], unicode):
          s[i] = s[i].encode('utf-8')
      self._writer.writerow(s)
      if item['unit'] == 'RMB':
        self.add_total(0, 0, float(item['amount']))
      else:
        self.add_total(float(item['amount']), float(item['actual_amount']), 0)

  def close(self):
    self._file.close()

  def read_total(self):
    with self._sum_lock:
      val = []
      with open(self.amount_file) as amount_file:
        for line in amount_file:
          val.append(float(line))
    return val

  def read_records(self):
    with self.lock:
      self._file.close()
      f = open(self.path, 'rb')
      reader = csv.DictReader(f, Logger.fields)
      # Read the header
      vals = []
      for item in reader:
        item['time'] = datetime.strptime(item['time'], '%Y/%m/%d %H:%M:%S')
        item['amount'] = float(item['amount'])
        item['actual_amount'] = float(item['actual_amount'])
        for field in item:
          value = item[field]
          if isinstance(value, str):
            item[field] = value.decode('utf-8')
        vals.append(item)
      vals.sort(key = lambda x : x['time'])
      self._file = open(self.path, 'ab', 1)
      self._writer = csv.DictWriter(self._file, Logger.fields)
    return vals

  def add_total(self, *delta):
    with self._sum_lock:
      val = self.read_total()
      for i in xrange(len(delta)):
        val[i] += delta[i]
      with open(self.amount_file, 'w') as amount_file:
        for v in val:
          print >> amount_file, v
    
  def add_from_input(self):
    item = {}
    print '1: paypal'
    print '2: taobao'
    print '3: alipay'

    method = int(raw_input('Select the payment method:'))
    method = ['paypal', 'taobao', 'alipay'][method - 1]
    item['method'] = method
    if method == 'paypal':
      item['unit'] = 'USD'
    else:
      item['unit'] = 'RMB'

    for field in Logger.fields:
      if field == 'actual_amount':
        if method in ['taobao', 'alipay']:
          item['actual_amount'] = item['amount']
        else:
          item['actual_amount'] = float(raw_input(field + ':'))
      elif field == 'amount':
        item[field] = float(raw_input(field + ':'))
      elif field == 'time':
        if method == 'paypal':
          fmt = '%Y-%b-%d %H:%M:%S'
        else:
          fmt = '%Y-%m-%d %H:%M:%S'
        item[field] = datetime.strptime(raw_input(field + ':'), fmt)
      elif field in ['method', 'unit']:
        pass
      elif field == 'nickname' and method != 'taobao':
        item[field] = item['name']
      else:
        item[field] = unicode(raw_input(field + ':'), 'gbk')

    self.log(item)
    print 'item added'

def main():
  parser = argparse.ArgumentParser()
  parser.add_argument('-l', '--log', dest='logfile', help='Logfile',
      required=True)
  args = parser.parse_args()
  logger = Logger(vars(args))
  while True:
    logger.add_from_input()
    if raw_input('continue(y/N)?') != 'y':
      break
  logger.close()

if __name__ == '__main__':
  main()

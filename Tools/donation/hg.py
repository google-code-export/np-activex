from hgapi import *
import shutil
import os
import threading
import optparse
import traceback
import log
from datetime import datetime, timedelta

class HGDonationLog:
  def __init__(self, config, logger):
    self._path = config['path']
    self._repo = Repo(self._path)
    self._target = config['logfile']
    self._templatefile = config['template']
    self._update_interval = float(config.get('update_interval', 300))
    self._logger = logger
    self.lastupdate = datetime.fromtimestamp(0)

  def start_listener(self):
    self.thread = threading.Thread(target = self.listener_thread)
    self.thread.start()

  def listener_thread(self):
    self.update_file()
    while True:
      sleep(self._update_interval)
      lastdataupdate = logger.lastupdate()
      if lastdataupdate > self.lastupdate:
        self.update_file()

  def gen_file(self, path):
    with open(path, 'w') as f:
      with open(self._templatefile, 'r') as tempfile:
        template = tempfile.read().decode('utf-8')

      usd, usdnofee, cny = self._logger.read_total()
      chinatime = (datetime.utcnow() + timedelta(hours = 8))
      lastupdatestr = chinatime.strftime('%Y-%b-%d %X') + ' GMT+8'
      
      s = template.format(cny = cny, usd = usd, usdnofee = usdnofee, lastupdate = lastupdatestr)
      f.write(s.encode('utf-8'))
      
      records = self._logger.read_records()
      records.reverse()
      for item in records:
        t = item['time'].strftime('%b %d, %Y')
        item['datestr'] = t
        s = u'|| {nickname} || {amount:.2f} {unit} || {datestr} ||'.format(**item)
        print >>f, s.encode('utf-8')

  def update_file(self):
    try:
      self._repo.hg_command('pull')
      self._repo.hg_update(self._repo.hg_heads()[0])

      path = os.path.join(self._path, self._target)
      print 'update donation log on wiki at ', datetime.utcnow() + timedelta(hours=8)
      self.gen_file(path)
      print 'File generated'
      msg = 'Auto update from script'
      diff = self._repo.hg_command('diff', self._target)
      if diff == '':
        print 'No change, skipping update donation wiki'
        return
      else:
        print diff.encode('utf-8')
      self._repo.hg_commit(msg, files = [self._target])
      print 'change committed'
      self._repo.hg_command('push')
      print 'repo pushed to server'
      self.lastupdate = datetime.utcnow() + timedelta(hours = 8)
    except Exception as ex:
      print 'Update wiki failed: ', str(ex).encode('utf-8')
      traceback.print_exc()

def main():
  parser = optparse.OptionParser()
  parser.add_option('-w', '--wiki', dest='path', help='Your wiki repo')
  parser.add_option('-o', '--output', dest='logfile', help='Your logging file')
  parser.add_option('-t', '--template', dest='template',
      help='Your template file')
  parser.add_option('-l', '--logfile', dest='log', help='Log file')

  options, args = parser.parse_args()
  logger = log.Logger({'logfile': options.log})
  print vars(options)
  hgclient = HGDonationLog(vars(options), logger)
  hgclient.update_file()

if __name__ == '__main__':
  main()

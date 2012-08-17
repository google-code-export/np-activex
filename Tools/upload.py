# Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
# Use of this source code is governed by a Mozilla-1.1 license that can be
# found in the LICENSE file.
import googlecode_upload
import tempfile
import urllib2
import optparse
import os

extensionid = 'lgllffgicojgllpmdbemgglaponefajn'

def download():
  url = ("https://clients2.google.com/service/update2/crx?"
       "response=redirect&x=id%3D" + extensionid + "%26uc")
  response = urllib2.urlopen(url)
  filename = response.geturl().split('/')[-1]
  version = '.'.join(filename.replace('_', '.').split('.')[1:-1])
  name = os.path.join(tempfile.gettempdir(), filename)
  f = open(name, 'wb')
  data = response.read()
  f.write(data)
  f.close()
  return name, version

def upload(path, version, user, password):
  summary = 'Extension version ' + version + ' download'
  labels = ['Type-Executable']
  print googlecode_upload.upload(
      path, 'np-activex', user, password, summary, labels)

def main():
  parser = optparse.OptionParser()
  parser.add_option('-u', '--user', dest='user',
                    help='Your Google Code username')
  parser.add_option('-w', '--password', dest='password',
                    help='Your Google Code password')
  
  options, args = parser.parse_args()
  name, version = download()
  print 'File downloaded ', name, version
  upload(name, version, options.user, options.password)
  os.remove(name)

if __name__ == '__main__':
  main()

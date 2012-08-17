import subprocess
import tempfile
import shutil
import os
import zipfile

class Packer:
  def __init__(self, input_path, outputfile):
    self.input_path = os.path.abspath(input_path)
    self.outputfile = os.path.abspath(outputfile)
    self.tmppath = None

  def pack(self):
    if self.tmppath == None:
      self.tmppath = tempfile.mkdtemp()
    else:
      self.tmppath = os.path.abspath(self.tmppath)
      if not os.path.isdir(self.tmppath):
        os.mkdir(self.tmppath)
    self.zipf = zipfile.ZipFile(self.outputfile, 'w', zipfile.ZIP_DEFLATED)
    self.processdir('')
    self.zipf.close()

  def processdir(self, path):
    dst = os.path.join(self.tmppath, path)
    if not os.path.isdir(dst):
      os.mkdir(dst)
    for f in os.listdir(os.path.join(self.input_path, path)):
      abspath = os.path.join(self.input_path, path, f)
      if os.path.isdir(abspath):
        self.processdir(os.path.join(path, f))
      else:
        self.processfile(os.path.join(path, f))

  def processfile(self, path):
    src = os.path.join(self.input_path, path)
    dst = os.path.join(self.tmppath, path)
    if not os.path.isfile(dst) or os.stat(src).st_mtime > os.stat(dst).st_mtime:
      ext = os.path.splitext(path)[1].lower()
      op = None
      if ext == '.js':
        if path.split(os.sep)[0] == 'settings':
          op = self.copyfile
        elif os.path.basename(path) == 'jquery.js':
          op = self.copyfile
        else:
          op = self.compilefile
      elif ext in ['.swp', '.php']:
        pass
      else:
        op = self.copyfile
      if op != None:
        op(src, dst)
    if os.path.isfile(dst):
      self.zipf.write(dst, path)

  def copyfile(self, src, dst):
    shutil.copyfile(src, dst)

  def compilefile(self, src, dst):
    args = ['java', '-jar', 'compiler.jar',\
        '--js', src, '--js_output_file', dst]
    args += ['--language_in', 'ECMASCRIPT5']
    print 'Compiling ', src
    retval = subprocess.call(args)
    if retval != 0:
      os.remove(dst)
      print 'Failed to generate ', dst

a = Packer('..\\chrome', '..\\plugin.zip')
a.tmppath = '..\\output'
a.pack()

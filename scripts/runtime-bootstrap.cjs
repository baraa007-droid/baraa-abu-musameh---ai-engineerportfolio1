'use strict';
// Node 24 + tsx may call os.userInfo() while creating its temp directory.
// The restricted Windows runner can return ENOMEM; use tsx's supported POSIX branch.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}

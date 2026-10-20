<?php
declare(strict_types=1);
require_once __DIR__.'/lib.php';
auto_install_if_needed();
$dir = rtrim(cfg()['upload_dir'],'/');
$c = cfg();
$urlBase = rtrim($c['upload_url'],'/');
if (!is_dir($dir)) exit;
$stmt = db()->prepare('INSERT OR IGNORE INTO media (filename, url, mime, kind, size, created_at) VALUES (?,?,?,?,?,?)');
$stmtDel = db()->prepare('DELETE FROM media WHERE id=?');
$finfo = new finfo(FILEINFO_MIME_TYPE);
$existing = [];
$rs = db()->query('SELECT id, filename FROM media');
while($r=$rs->fetch()) $existing[$r['filename']] = $r['id'];
$files = array_values(array_filter(scandir($dir), fn($x)=>$x!='.'&&$x!='..'));
foreach($files as $fn){
  $path = $dir.'/'.$fn;
  if (is_dir($path)) continue;
  $mime = $finfo->file($path) ?: 'application/octet-stream';
  $kind = str_starts_with($mime,'image/') ? 'image' : (str_contains($mime,'audio') ? 'audio' : 'file');
  $size = filesize($path);
  $now = gmdate('Y-m-d H:i:s');
  $url = $urlBase.'/'.$fn;
  db()->prepare('INSERT OR IGNORE INTO media (filename,url,mime,kind,size,created_at) VALUES (?,?,?,?,?,?)')->execute([$fn,$url,$mime,$kind,$size,$now]);
}
echo 'done';

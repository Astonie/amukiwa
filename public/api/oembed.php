<?php
declare(strict_types=1);
require_once __DIR__.'/lib.php';
auto_install_if_needed();
header('Content-Type: application/json; charset=utf-8');
$u = $_GET['url'] ?? '';
if (!$u) { json_out(['error'=>'missing url'],400); }
$ch = curl_init($u);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_exec($ch);
$final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
curl_close($ch);
if (!$final || $final === $u) { json_out(['error'=>'could not resolve'],400); }
json_out(['url'=>$final]);

<?php

foreach(array('x', 'y', 'z', 'dataset', 'callback') as $arg)
	if(!isset($_GET[$arg]))
		die('missing argument '.$arg.', use like this: http://datatiles.personalwerk.de/jsonp.php?callback=foo&dataset=countries&z=0&x=0&y=0');

header('Content-Type: text/javascript');
$file = sprintf('%s/%s/%u/%u/%u.json', dirname(__FILE__), $_GET['dataset'], $_GET['z'], $_GET['x'], $_GET['y']);

echo $_GET['callback'].'(';
readfile($file);
echo ');';

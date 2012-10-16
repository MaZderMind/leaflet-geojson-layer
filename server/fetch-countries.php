<?php
$db = new PDO('pgsql:dbname=osm');
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$minimalSize = 2080332000; // Minimalgröße der übernommenen Landflächen in km² * 100
$zoom = range(1, 8); // Angeforderte Zoomlevel
$dir = dirname(__FILE__).'/countries';

include('fetch-countries-query.php');

foreach($zoom as $z)
{
	$n = pow(2, $z);
	for($x = 0; $x < $n; $x++) for($y = 0; $y < $n; $y++)
	{
		$args = array();
		$args['minlat'] = rad2deg(atan(sinh(pi() * (1 - 2 * $y / $n))));
		$args['maxlat'] = rad2deg(atan(sinh(pi() * (1 - 2 * ($y+1) / $n))));
		$args['minlon'] = $x / $n * 360.0 - 180.0;
		$args['maxlon'] = ($x+1) / $n * 360.0 - 180.0;

		$args['simplification'] = abs(156543.034 * cos($args['minlat']) / $n);
		$args['decimals'] = ceil($z / 3);

		echo "$z/$x/$y.. ";
		//print_r($args);

		$start = microtime(true);
		$stm->execute($args);
		$diff = microtime(true)-$start;
		echo round($diff, 1)."s\n";

		$features = array();
		foreach($stm as $row)
		{
			$geom = json_decode($row['json']);
			if(!$geom) continue;

			$features[] = array(
				'type' => 'Feature',
				'geometry' => json_decode($row['json']),
				'properties' => array(
					'englishnam' => $row['englishnam'],
				),
			);
		}

		@mkdir("$dir/$z/$x", 0777, true);
		file_put_contents("$dir/$z/$x/$y.json", json_encode(array(
			'type' => 'FeatureCollection',
			'features' => $features,
		)));
	}
}

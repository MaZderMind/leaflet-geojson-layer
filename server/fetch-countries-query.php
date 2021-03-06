<?php

$stm = $db->prepare("

	SELECT
		englishnam,
		ST_AsGeoJSON(
			ST_Transform(
				ST_Intersection(
					ST_Expand(
						ST_Transform(
							ST_SetSRID(
								ST_MakeBox2D(
									ST_Point(:minlon, :minlat),
									ST_Point(:maxlon, :maxlat)
								),
								4326
							),
							900913
						),
						:simplification*20::float
					),
					ST_Buffer(
						ST_Simplify(
							the_geom,
							:simplification
						),
						0
					)
				),
				4326
			),
			:decimals 
		) AS json

	FROM countries_buffered
		WHERE ST_Area(the_geom) > $minimalSize
		AND the_geom && 
			ST_Expand(
				ST_Transform(
					ST_SetSRID(
						ST_MakeBox2D(
							ST_Point(:minlon, :minlat),
							ST_Point(:maxlon, :maxlat)
						),
						4326
					),
					900913
				),
				:simplification*10::float
			)

");

<?php

$stm = $db->prepare("

	SELECT
		'-' AS englishnam,
		ST_AsGeoJSON(
			ST_Transform(
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
					:simplification*75::float
				),
				4326
			),
			:decimals 
		) AS json

");

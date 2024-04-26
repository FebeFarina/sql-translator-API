export const examples_titsa = [
    {
        "input": "¿Cuál es el nombre largo de la línea 1?",
        "output": {
            "sqlQuery": "SELECT linea_nombre_largo FROM titsa.lineas WHERE id_linea = 1 LIMIT 1.",
            "answer": "TRANVIA L1"
        }
    },
    {
        "input": "¿Cuál es el nombre de la parada 1001?",
        "output": {
            "sqlQuery": "SELECT parada_nombre FROM titsa.paradas WHERE id_parada = 1001 LIMIT 1.",
            "answer": "COCHERA PARQUE LA REINA"
        }
    },
    {
        "input": "¿Cuántos pasajeros en total viajaron en la línea 108 durante marzo?",
        "output": {
            "sqlQuery": "SELECT SUM(pasajeros_total) FROM tista.viajes_marzo WHERE id_linea_viaje_actual = 108;",
            "answer": "En total, 50308 pasajeros viajaron en la línea 108 durante marzo."
        }
    },
    {
        "input": "¿Cuántas líneas distintas pasan por la parada Radazul?",
        "output": {
            "sqlQuery": "SELECT COUNT(*) FROM(SELECT DISTINCT id_linea_viaje_actual FROM titsa.viajes_marzo vm JOIN titsa.paradas p ON vm.id_parada_entrada_viaje_actual = p.id_parada WHERE p.parada_nombre = 'RADAZUL'); ",
            "answer": "Un total de 8 líneas distintas pasan por la parada Radazul."
        }
    },
    {
        "input": "¿Cuál es la parada de la que más pasajeros bajaron en marzo?",
        "output": {
            "sqlQuery": "SELECT parada_nombre, COUNT(parada_nombre) AS myCount FROM titsa.paradas JOIN titsa.viajes_marzo ON id_parada = id_parada_salida_viaje_actual GROUP BY parada_nombre ORDER BY myCount DESC LIMIT 1;",
            "answer": "La parada de la que más pasajeros bajaron en marzo es la parada Intercambiador Santa Cruz."
        }
    }
]
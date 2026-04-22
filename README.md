# Ficha PWA de La Marca del Este

PWA local para llevar una ficha de personaje y los datos vivos de la partida: PG, CA, PX, monedas, carga, inventario, equipo, conjuros, auras, pasivas y notas.

## Uso local

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Abre `http://127.0.0.1:4173/`.

La app guarda los cambios automáticamente en `localStorage`. Desde la barra superior puedes exportar la ficha a JSON, importarla de nuevo o imprimir todas las secciones.

## Catálogo local

Los datos de clases, razas, tienda, conjuros y efectos viven en `data/catalog.json`. En local se carga desde ese archivo; para producción, el punto de cambio natural será la función `loadCatalog()` de `app.js`, sustituyendo la ruta local por el raw de GitHub.

La tienda compra contra la bolsa de monedas, hace cambio automático y añade el objeto al inventario. Si el artículo comprado es un arma con daño, también crea un ataque bloqueado que puede editarse después.

## Decisiones de reglas

- Se guarda CA descendente y CA equivalente entre corchetes, como en las tablas fotografiadas.
- La moneda usa la equivalencia de la tabla: 1 mo = 10 mp = 2 me = 100 mc y 1 mpt = 10 mo.
- La carga se calcula en kg como `cantidad × peso`. El límite de carga se deja editable para ajustarlo a la mesa.
- Los modificadores de atributos usan el tramo clásico: 3, 4-5, 6-8, 9-12, 13-15, 16-17 y 18+.
- El nivel y los PX del siguiente nivel se calculan desde la tabla de progresión de la clase seleccionada cuando está activado "Calcular nivel por PX".

# Cómo volver atrás si algo se rompe

## Qué es `v1-estable`

`v1-estable` es una marca (tag) que pusimos en la rama `main` el 17/10/2026, **justo antes de publicar la web nueva** (commit `a963995`). Ahí está la versión que funcionaba:
- la web anterior, con el diseño del compañero (tema oscuro, menú de billetera e ícono de la pestaña);
- el contrato v1: `CAACEJBBUWX4XGU7IPD7CMMYVCDLVZNDR5T2CIWSGNLPQTL3JTQ63HTZ`.

La web pública (https://matiasledesma449.github.io/Orbita/) sale de `main`. Volver atrás significa dejar `main` igual que `v1-estable`.

## Volver a `v1-estable` (copiar y pegar en la terminal del Codespace)

```bash
cd /workspaces/Orbita && git fetch origin && git checkout main && git pull origin main && git rm -r -q . && git checkout v1-estable -- . && git commit -m "Vuelve a v1-estable" && git push origin main && git checkout v2
```

Qué hace, en simple: va a `main`, borra los archivos, trae los de `v1-estable`, guarda el cambio y lo sube. En 1 o 2 minutos, GitHub Pages vuelve a mostrar la web anterior.

- **No borra nada del historial.** La web nueva sigue guardada en la rama `v2` y en el historial de `main`.
- No usa `--force`, así que no pisa el trabajo de nadie. Si `git push` dice que hay cambios nuevos en `main` (por ejemplo, del compañero), primero corré `git pull origin main` y después de nuevo `git push origin main`.
- Lo probé el 17/10/2026 en una rama de prueba: el resultado quedó **idéntico** a `v1-estable`.

## Deshacer la vuelta atrás (volver a la web nueva)

Si ya se arregló el problema y querés publicar otra vez la web nueva:

```bash
cd /workspaces/Orbita && git checkout main && git pull origin main && git revert --no-edit HEAD && git push origin main && git checkout v2
```

Esto deshace el último commit ("Vuelve a v1-estable"). También lo probé: el resultado queda **idéntico** a la web nueva. Correlo solo si el último commit de `main` es justamente "Vuelve a v1-estable" (se ve con `git log --oneline -1 main`).

## Ver dónde está cada cosa

```bash
git log --oneline -1 v1-estable    # la versión estable
git log --oneline -1 origin/main   # lo que está publicado
git log --oneline -1 origin/v2     # la versión en desarrollo
```

# Cloudflare proxy — guía portfolio

## Hallazgo

De los 16 proyectos del portfolio, solo 2 sacan **A** en Website Carbon. El resto (14) sacan **F** por una sola razón: el sitio se sirve **directamente desde GitHub Pages** (IPs `185.199.x.153`), y GitHub Pages no está en el registro verde de The Green Web Foundation.

La diferencia entre **A** (18 kWh/año por 10k visitas) y **F** (350+ kWh/año) NO es el peso de la web — es **dónde se sirven los bytes**. Cloudflare como proxy CDN está marcado como verde desde 2017; GitHub Pages no.

Solución: activar el **proxy naranja** de Cloudflare en cada dominio. Si el dominio no está aún en Cloudflare, migrar el DNS allí (es gratis).

> No requiere modal de cookies ni cambia nada legal. Cloudflare como proxy/CDN es solo infraestructura, igual que GitHub Pages.

## Estado por dominio

| # | Dominio | NS actual | IPs actuales | Estado | Acción |
|---|---|---|---|---|---|
| 1 | rikamichie.com | `vida.ns.cloudflare.com` | 185.199.108-109.153 | CF DNS, proxy OFF | Activar proxy |
| 2 | **andreacarilla.work** | `isaac.ns.cloudflare.com` | 104.21.4.143, 172.67.154.33 | **CF DNS, proxy ON** ✅ | Ya OK (A) |
| 3 | diegosanmarcos.com | `tate.ns.cloudflare.com` | 185.199.110-111.153 | CF DNS, proxy OFF | Activar proxy |
| 4 | **mikebros.com** | `fatima.ns.cloudflare.com` | 188.114.96-97.5 | **CF DNS, proxy ON** ✅ | Ya OK |
| 5 | mirandaperezhita.com | `meilani.ns.cloudflare.com` | 185.199.108-109.153 | CF DNS, proxy OFF | Activar proxy |
| 6 | conorashlee.com | `sri.ns.cloudflare.com` | 185.199.110-111.153 | CF DNS, proxy OFF | Activar proxy |
| 7 | viciostorpes.com | `norm.ns.cloudflare.com` | 185.199.109-110.153 | CF DNS, proxy OFF | Activar proxy |
| 8 | maxazemar.com | `braden.ns.cloudflare.com` | 185.199.110-111.153 | CF DNS, proxy OFF | Activar proxy |
| 9 | analopezserrano.com | `ns1038.ui-dns.com` (IONOS) | 185.199.108-110.153 | NO CF DNS | Migrar DNS a CF |
| 10 | mokakopa.com | `newt.ns.cloudflare.com` | 185.199.108-111.153 | CF DNS, proxy OFF | Activar proxy |
| 11 | noancittadino.com | `ns9.wixdns.net` (Wix) | 185.199.108-111.153 | NO CF DNS | Migrar DNS a CF |
| 12 | 930blurberrie.com | `paityn.ns.cloudflare.com` | 185.199.108-111.153 | CF DNS, proxy OFF | Activar proxy |
| 13 | paulabarjau.studio | `elle.ns.cloudflare.com` | 185.199.108-111.153 | CF DNS, proxy OFF | Activar proxy |
| 14 | estructuras3000.com | `ns1.dns-parking.com` | 185.199.109-110.153 | NO CF DNS | Migrar DNS a CF |
| 15 | bertaesteve.cat | `ns2.dondominio.com` | 185.199.109-111.153 | NO CF DNS | Migrar DNS a CF |
| 16 | jaumeclotet.com | `eloise.ns.cloudflare.com` | 185.199.109-111.153 | CF DNS, proxy OFF | Activar proxy |
| 17 | elmundodelasjordis.com | `ernest.ns.cloudflare.com` | 185.199.109-110.153 | CF DNS, proxy OFF | Activar proxy |
| — | **meowrhino.studio** | `mimi.ns.cloudflare.com` | 185.199.110-111.153 | CF DNS, proxy OFF | **Activar proxy (1º paso)** |

**Resumen**:
- 11 dominios con CF DNS y proxy OFF → 1 click cada uno.
- 4 dominios sin CF DNS → migrar (más curro pero único).
- 2 dominios ya OK.

## Pasos para activar proxy (CF DNS ya configurado)

Si yo (manu) tengo acceso al panel de Cloudflare del cliente:

1. Entrar a `dash.cloudflare.com` y seleccionar el dominio.
2. Sección **DNS → Records**.
3. Para cada registro **A** apuntando a `185.199.108-111.153`, hacer click en el icono de nube **gris** para que pase a **naranja** ("Proxied").
4. Guardar (es automático).
5. Esperar 2-3 min.
6. Verificar: `dig +short DOMINIO` debería mostrar IPs `104.21.x.x` o `172.67.x.x`.
7. Re-test en `https://www.websitecarbon.com/website-carbon-calculator/`.

Si el dominio está en Cloudflare del cliente y yo no tengo acceso: enviar el email del bloque siguiente.

## Pasos para migrar DNS a Cloudflare (no en CF)

1. Crear cuenta gratuita en `cloudflare.com` (o usar la del cliente).
2. **Add a site** → introducir el dominio. Plan: **Free**.
3. CF importa los DNS records existentes. Revisar que el registro A a GitHub Pages está y los CNAME `_github-pages-challenge-*` también.
4. CF muestra **2 nameservers** (ej. `xxx.ns.cloudflare.com`). Apuntarlos.
5. En el registrador actual del dominio (IONOS, Wix, dondominio, dns-parking), cambiar los nameservers a los de CF.
6. Esperar propagación (1-24h, normalmente <1h).
7. Cuando CF detecta que es el DNS autoritativo, ya se puede activar el proxy (pasos del bloque anterior).

> **Wix** (noancittadino.com): el cliente debe permitir gestionar el DNS desde fuera. Wix lo permite en su panel: **Settings → Domain → Connect**. Si está bloqueado, contactar soporte de Wix.
> **dondominio** (bertaesteve.cat): cambiar nameservers desde el panel de dondominio.
> **dns-parking** (estructuras3000.com): el dominio está aparcado, igual conviene moverlo a un registrador propio antes (Namecheap, Porkbun, Dynadot).
> **IONOS** (analopezserrano.com): cambiar nameservers en el panel de IONOS bajo Domain → DNS.

## Plantilla de email para clientes

### Versión ES

```
Asunto: 1 minuto para que tu web sea más sostenible

Hola [NOMBRE],

Una mejora rápida: si activamos un setting en Cloudflare, tu web pasa de la nota F a A en huella de carbono (la mide websitecarbon.com). Sin tocar el código, sin afectar al dominio ni los emails, sin cookies nuevas. Tu web cumple criterios de sostenibilidad y carga algo más rápida en móvil.

¿Cómo? Si me das acceso de Cloudflare un momento (o lo hago contigo en una llamada de 5 min), activo la “nube naranja” en los registros DNS. Es un click.

Si no usas Cloudflare aún (nameservers actuales: [NS]), te ayudo a migrar el dominio. Es gratis y se hace en 15 min.

¿Te encaja?

— manu / meowrhino.studio
```

### Versió CAT

```
Assumpte: 1 minut perquè la teva web sigui més sostenible

Hola [NOM],

Una millora ràpida: si activem un setting a Cloudflare, la teva web passa de la nota F a A en petjada de carboni (la mesura websitecarbon.com). Sense tocar el codi, sense afectar el domini ni els correus, sense cookies noves. La teva web compleix criteris de sostenibilitat i carrega una mica més ràpid al mòbil.

Com? Si em dones accés a Cloudflare un moment (o ho fem junts en una trucada de 5 min), activo la “núvol taronja” als registres DNS. És un click.

Si encara no fas servir Cloudflare (nameservers actuals: [NS]), t'ajudo a migrar el domini. És gratis i es fa en 15 min.

T'encaixa?

— manu / meowrhino.studio
```

### EN version

```
Subject: 1 minute to make your site greener

Hi [NAME],

Quick win: if we toggle one setting in Cloudflare, your site jumps from F to A on the carbon footprint scale (measured by websitecarbon.com). No code changes, no impact on the domain or your email, no new cookies. Your site meets sustainability criteria and loads a bit faster on mobile.

How? If you give me Cloudflare access for a moment (or we do it together in a 5-min call), I switch on the "orange cloud" on the DNS records. One click.

If you're not using Cloudflare yet (current nameservers: [NS]), I'll help you migrate the domain. Free and takes 15 min.

Sound good?

— manu / meowrhino.studio
```

## Verificación rápida (cualquier dominio)

```bash
dig +short DOMINIO
# Si IPs son 104.21.x.x o 172.67.x.x o 188.114.x.x → proxy ON ✅
# Si IPs son 185.199.x.153 → todavía GH Pages directo ❌
```

Y luego abrir `https://www.websitecarbon.com/website-carbon-calculator/` con el dominio.

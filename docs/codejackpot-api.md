

=========== data-id="welcome" data-group="" data-title="Welcome" data-icon="house" data-lead="Everything you need to integrate codejackpot games on your casino."

Every request is signed and every response is JSON. Secrets are shown once, when they are issued or rotated.

| | |
| --- | --- |
| **Base URL** | `https://api.codejackpot.online` |
| **Launch URL** | `https://launch-ops.codejackpot.online/api/v1/game/launch` |
| **Panel** | `https://panel.codejackpot.online/panel/` |

## Where to start

- [Quickstart](#quickstart) — the order to do things in, from credentials to your first real-money launch.
- [Credentials](#credentials) and [Signing](#signing) — how every call is authenticated.
- [Game Launch](#game-launch) and [Seamless Wallet](#wallet) — the two things a live integration needs.
- [Free Rounds API](#free-rounds) — award rounds to your players yourself.


=========== data-id="signup" data-group="Getting started" data-title="Open an account" data-icon="user-plus" data-lead="Sign up in the back office and integrate on the sandbox straight away."

Open `https://panel.codejackpot.online/panel/#register` and fill in your company name, email and a password.

1. **Your credentials are shown once**, right after sign-up: standard, streamer and sandbox AppID + secret (see [Credentials](#credentials)). Save them; you can rotate them later under Configuration → API Keys.
2. **Confirm your email** with the link we send you.
3. **Integrate on the sandbox** — it plays on a fun wallet we host (see [Quickstart](#quickstart)).
4. **Buy credits to go live.** A new account has prepaid credit of $0, so real-money launches answer `1040` until the first purchase (see [Buying credits](#credits)). Your API fee (a share of net GGR) is shown on the Billing pages.

Every provider is on for you from the start, except live casino, which we switch on per account — ask for it under Configuration → Live Casino (see [Live casino](#live-casino)).

## Accepted email addresses

Gmail, Outlook / Hotmail / Live, Yahoo, iCloud, Proton, AOL, Yandex, GMX and Mail.ru. Another company domain can be allowed on request. One mailbox is one account however it is spelled: `j.smith+casino@gmail.com` and `jsmith@googlemail.com` are the same address.

## Passwords and two-factor authentication

| rule | |
| --- | --- |
| length | 10 to 128 characters |
| variety | three of: lower case, upper case, a digit, a symbol — or 16+ characters |
| not allowed | a common password, or one built on your email name or company name |

Turn on two-factor authentication under Profile → Security: scan the QR code with an authenticator app and confirm one code. You get ten one-time **recovery codes**; each signs you in once in place of the authenticator code. A forgotten password is reset by email from the sign-in page (the link works once, for 30 minutes); a reset or a password change signs out every other session.

> [!NOTE]
> Sign-up, sign-in, email links and password resets are rate limited per address and per network (`429`, code `1029`, with `Retry-After`).


=========== data-id="quickstart" data-group="Getting started" data-title="Quickstart" data-icon="play" data-lead="From credentials to your first real-money round."

1. **Receive your credentials** — or [open an account](#signup) yourself. You get three AppID + secret pairs: standard, streamer and sandbox (see [Credentials](#credentials)).
2. **Sign a first call.** List the catalogue with `GET /v1/games` (see [Signing](#signing) and [Game List](#game-list)).
3. **Integrate on the sandbox first.** The sandbox credential plays on a fun wallet we host and never calls your wallet.
4. **Set your wallet URL** with `PUT /v1/wallet` and check it with `POST /v1/wallet/test` (see [Wallet URL & test](#wallet-url)).
5. **Launch a game** with the standard credential (see [Game Launch](#game-launch)). A new self-service account [buys credits](#credits) first: real-money launches need prepaid credit.

> [!TIP]
> The panel shows the same data as the API: players, rounds, reports, billing, keys and your payout target.


=========== data-id="credentials" data-group="Getting started" data-title="Credentials" data-icon="key-round" data-lead="Three credentials, each an AppID + secret pair, used the same way."

The AppID says what kind of play it is.

| Credential | AppID | Use |
| --- | --- | --- |
| standard | `<appId>` | real-money launches; the only credential that manages the account through this API and the panel |
| streamer | `<appId>.streamer` | launches for your streamers: real games, no GGR charged, separate players |
| sandbox | `<appId>-sandbox` | integration testing on a fun wallet we host; never billed, no wallet callbacks needed |

## Rotating a secret

Rotating keeps the previous secret valid for 24 hours.

@endpoint POST https://api.codejackpot.online/v1/keys/rotate

```json
{"kind":"standard"}
```

The new secret is shown once. `GET /v1/keys` lists your credentials (no secrets).

## IP allow-list

Each credential can be restricted to your server addresses (IPs or CIDRs); an empty list accepts any address — the signature is the real gate.

@endpoint PUT https://api.codejackpot.online/v1/keys/{kind}/ipallow

```json
{"ips":["203.0.113.10","198.51.100.0/24"]}
```

A launch from an address that is not on the list is refused with `1014`, and a signed API call with `1012`. The panel's **IP Whitelist** page manages the same lists.


=========== data-id="signing" data-group="Getting started" data-title="Signing" data-icon="shield-check" data-lead="Every request carries AppID, Ts and Sign headers."

Headers on every request: `AppID`, `Ts` (unix seconds, within 60 s of our clock) and `Sign`:

```text
Sign = hex( HMAC-SHA256( secret, AppID + "|" + Ts + "|" + METHOD + "|" + PATH ) )
```

- `METHOD` is upper-case.
- `PATH` is the request path without the query string, **percent-decoded** (e.g. `/v1/games`, `/api/v1/game/launch`, `/v1/billing/statements/acme|2026-09-01T00:00:00Z/pdf`). We accept the encoded form too.

## Example

```bash
ts=$(date +%s); path=/v1/games
sign=$(printf "%s" "acme|$ts|GET|$path" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl https://api.codejackpot.online$path -H "AppID: acme" -H "Ts: $ts" -H "Sign: $sign"
```

> [!WARNING]
> A timestamp more than 60 s away from our clock is refused (`1023`), and so is a wrong signature (`1011`).


=========== data-id="game-api" data-group="Integration" data-title="Game API" data-icon="gamepad-2" data-kids="game-list,game-launch,round-history" data-lead="The catalogue, launching a game, and what was played."

- [Game List](#game-list) — every game entitled to you, and switching games or providers off.
- [Game Launch](#game-launch) — get a URL to open a game for a player.
- [Round History](#round-history) — your players and their rounds.


=========== data-id="game-list" data-group="Integration" data-parent="game-api" data-title="Game List" data-icon="list" data-lead="Every game entitled to you, with enabled per game."

@endpoint GET https://api.codejackpot.online/v1/games

## Response

```json
[{"gameId":"astros0000000000","slug":"astros","name":"Astros","provider":"redtiger","providerName":"Red Tiger","image":"https://…","rtp":95.72,"releaseDate":"2024-01-16","freeRounds":false,"enabled":true}]
```

## Switching games off

@endpoint PUT https://api.codejackpot.online/v1/games/{gameId}/enabled

@endpoint PUT https://api.codejackpot.online/v1/providers/{provider}/enabled

```json
{"enabled":false}
```

A disabled game is refused at launch with `1033` within a few seconds. Changes apply to new launches only.

## Live casino tables

When live casino is on for your account, its tables are in this list too, with `"provider":"pplive"` (`"providerName":"Pragmatic Play Live"`) and no `rtp` or `releaseDate`. They launch like any game, on the standard key only: see [Live casino](#live-casino).


=========== data-id="game-launch" data-group="Integration" data-parent="game-api" data-title="Game Launch" data-icon="rocket" data-lead="Returns a URL that opens a game for your player."

@endpoint POST https://launch-ops.codejackpot.online/api/v1/game/launch

## Request

```json
{"UserID":"player-123","GameID":"astros0000000000","Language":"en","Platform":"desktop","Mode":"real","Currency":"EUR"}
```

| Field | Notes |
| --- | --- |
| `UserID` | your player id |
| `GameID` | the `gameId` from `/v1/games` |
| `Language` | e.g. `en` |
| `Platform` | `desktop` or `mobile` |
| `Mode` | `real` or `demo` |
| `Currency` | must be one of the currencies enabled on your account (`/v1/currencies`); omitted = your default. Every wallet callback for the resulting rounds names that currency |

## Response

```json
{"code":0,"data":{"Url":"https://…"}}
```

Open `Url` in an iframe or a new window. The URL is single-use and expires in 12 hours.

## Errors

`code` ≠ 0:

| code | meaning |
| --- | --- |
| 1002 | unknown AppID |
| 1011 / 1023 | bad signature / stale timestamp |
| 1014 | the calling address is not in this credential's IP allow-list |
| 1017 | `Currency` is not enabled on your account |
| 1001 | operator suspended |
| 1004 | game not available on the platform |
| 1030 | provider or game not entitled to your account |
| 1033 | game disabled by you (panel or `/v1/games/{id}/enabled`) |
| 1040 | prepaid credit exhausted — top up to resume (standard credential only) |
| 1034 | live casino with the sandbox or streamer credential — live tables play on the standard key only |
| 1035 | streamer and sandbox play are not available on self-registered accounts |


=========== data-id="round-history" data-group="Integration" data-parent="game-api" data-title="Round History" data-icon="history" data-lead="Your players, their rounds, and a single round's legs."

@endpoint GET https://api.codejackpot.online/v1/players?limit=100&skip=0&search=

Your players (all three credentials), with `money`: each account's settled rounds per currency (`currency`, `rounds`, `stake`, `win`), exact. `betGold` / `winGold` are the account's lifetime counters (wallet units × 10,000; they add a player's currencies together), kept for compatibility.

@endpoint GET https://api.codejackpot.online/v1/players/{userId}/rounds

Their last 200 rounds.

@endpoint GET https://api.codejackpot.online/v1/rounds/{roundId}

One round's legs and its ledger row.


=========== data-id="wallet" data-group="Integration" data-title="Seamless Wallet" data-icon="wallet" data-kids="cash-get,transfer,wallet-url" data-lead="For standard and streamer play we call your wallet at the URL on file."

The sandbox needs no wallet. Both calls are `POST` with a JSON body and expect a JSON reply in this envelope:

```json
{"code":0,"error":"","data":{"Balance":123.45}}          // success
{"code":1,"error":"insufficient funds","data":null}      // refusal — any non-empty "error" fails the leg
```

- [Cash/Get](#cash-get) — a user's balance.
- [Cash/TransferInOut](#transfer) — one leg of a round.
- [Wallet URL & test](#wallet-url) — set and check your URL.

> [!NOTE]
> Streamer callbacks carry AppID `<appId>.streamer` and are signed with the streamer secret, so you can route them to a fun wallet on your side.


=========== data-id="cash-get" data-group="Integration" data-parent="wallet" data-title="Cash/Get" data-icon="coins" data-lead="Balance of a user."

@endpoint POST {walletUrl}/Cash/Get

## Request

Body: `AppID`, `UserID`, `Ts`, `Sign`.

```text
Sign = hex(HMAC-SHA256(secret, AppID|UserID|Ts))
```

## Response

Reply `data.Balance` in the user's wallet currency:

```json
{"code":0,"error":"","data":{"Balance":123.45}}
```


=========== data-id="transfer" data-group="Integration" data-parent="wallet" data-title="Cash/TransferInOut" data-icon="arrow-left" data-lead="One leg of a round: a bet, a win or a refund."

@endpoint POST {walletUrl}/Cash/TransferInOut

## Request

| Field | Meaning |
| --- | --- |
| `AppID`, `UserID` | the credential that launched (`acme` or `acme.streamer`) and your user |
| `TransactionID` | idempotency key: the same id must return the same result without re-applying |
| `RoundID`, `GameID` | the round and the `gameId` from the catalogue |
| `Reason` | `bet`, `win` or `refund` |
| `Amount` | negative for a bet, positive for a win or refund, in the launch currency |
| `Currency` | the launch currency of this round (informational, not part of the signature) |
| `RealAmount` | the amount after your currency's wallet multiplier, when one is configured; otherwise equals `Amount` |
| `IsEnd` | true on the last leg of the round |
| `FreeRound`, `GrantID` | present when the leg belongs to a free-round campaign |
| `RefTransactionID` | on a `refund`: the bet leg being refunded |
| `ReqTime`, `Ts`, `Sign` | our clock (RFC 3339), unix seconds, and the signature |

```text
Sign = hex(HMAC-SHA256(secret, AppID|UserID|TransactionID|RoundID|Reason|GameID|Amount|Ts))
```

`Amount` is formatted with exactly four decimals (`-0.2000`, `12.5000`).

## Response

Reply `data.Balance` after applying the leg; you may echo `data.RealAmount` and we verify it matches. Refuse a bet with a non-empty `error` when the balance is insufficient — the round is then not played.

## Refunds

A round whose bet leg was accepted but that never reached its `win` (a lost session, a crash mid-round) is refunded by us: after 24 hours we send one `refund` leg for the bet amount, `IsEnd:true`, `RefTransactionID` naming the bet's `TransactionID`. Nothing is required of you beyond applying it; a `win` and a `refund` never both arrive for one round.

> [!NOTE]
> Verified 2026-09-18: a bet of −800.00 left open was returned as `refund +800.00` by the sweep.


=========== data-id="wallet-url" data-group="Integration" data-parent="wallet" data-title="Wallet URL & test" data-icon="link" data-lead="You set the URL yourself and can test it before going live."

@endpoint PUT https://api.codejackpot.online/v1/wallet

```json
{"walletUrl":"https://wallet.example.com/codejackpot"}
```

HTTPS, no query string; the standard credential or a panel owner. Read it back with `GET /v1/wallet`, or use the panel under **Configuration → Wallet Callback**. It takes effect within 10 seconds.

## Test

@endpoint POST https://api.codejackpot.online/v1/wallet/test

Performs one real `/Cash/Get` for the probe player `codejackpot-wallet-test`, signed exactly as our calls are, and reports the HTTP status, the envelope and the balance it got back — run it before you expect real-money launches to work.

> [!TIP]
> The sandbox credential never calls your wallet, so integrate there first.


=========== data-id="free-rounds" data-group="Integration" data-title="Free Rounds API" data-icon="star" data-kids="fr-stakes,fr-grant,fr-query,fr-effects" data-lead="Award a player N rounds on one game at one stake, costing the player nothing and paying out normally."

Four endpoints on the launch host, signed exactly like the launch call (the path is part of the signature, so sign each one separately):

| Endpoint | What it does |
| --- | --- |
| `POST https://launch-ops.codejackpot.online/api/v1/freeround/stakes` | the stakes you MAY award for one game in one currency — **call this first** |
| `POST …/api/v1/freeround/grant` | award N rounds |
| `POST …/api/v1/freeround/query` | read your grants back |
| `POST …/api/v1/freeround/revoke` | take back the unplayed remainder |

There is no special launch URL. Grant server-side; the player's next ordinary launch of that game, in the currency of the grant, offers or plays the rounds. Every response uses the standard envelope `{"code":0,"error":"","data":{…}}`; keys are capitalised (`GrantID`, not `grantId`).

## Supported providers

Hacksaw, Quickspin, BGaming, Relax, Push Gaming, Play'n GO, Pragmatic.

> [!WARNING]
> NoLimit, NetEnt and Red Tiger are not supported — `/stakes` answers `1043` for them (NoLimit answers a ladder but its games do not consume grants): do not grant on those.


=========== data-id="fr-stakes" data-group="Integration" data-parent="free-rounds" data-title="Stakes" data-icon="sliders-horizontal" data-lead="Which stakes you may award."

@endpoint POST https://launch-ops.codejackpot.online/api/v1/freeround/stakes

## Request

```json
{"GameID":"2319","Currency":"EUR"}
```

`GameID` is the `gameId` from `/v1/games` (the prefixed forms `hacksaw_2319` / `hs_2319` resolve too). `Currency` defaults to your default currency.

## Response

| Field in `data` | Meaning |
| --- | --- |
| `Kind` | `"int"` or `"float"` — decides whether you send `Stake` or `StakeF` to `grant` |
| `Stakes` / `StakesF` | the awardable ladder for that game, **for your account and that currency**, already scaled. One of the two is filled, the other `[]` |
| `Default` / `DefaultF` | the game's default stake in that ladder; used when you send no stake |
| `Unit` | what one stake unit means for this provider (table below) |
| `Scale` | the factor applied to the game's native ladder for your currency |
| `GameID` / `Provider` / `NativeID` | the canonical id of the game you named (not an echo of what you sent) |
| `StakeValues` / `DefaultValue` | the same ladder and default as plain numbers, whatever `Kind` is. They pair with `StakeValue` on a grant. A stake, **not money** |
| `TotalBets` / `DefaultTotalBet` | **the bet to show** for a free round at each stake: the money a *paid* round at that stake debits — exactly the `Amount` of our bet callback, in that currency — aligned index for index with `StakeValues` (and `Stakes`/`StakesF`). One unit for every provider. For a currency whose callbacks carry a scaled integer instead of money (GEMS: a 1.5 MGEMS bet arrives as `1500000`), `TotalBet` is in the unit the game shows (MGEMS) — multiply it by the same factor your callbacks use. `0` when we cannot state the game's multiplier |

> [!WARNING]
> Never compute a stake yourself and never reuse one across currencies: the same game has a different ladder per currency (`Scale`), and a value that is legal in one currency is refused in another.

## Stake units

| Provider | `Kind` | `Unit` — what one stake unit is |
| --- | --- | --- |
| Hacksaw | int | bet level in minor units (100 = 1.00) |
| Quickspin | int | bet in minor units (100 = 1.00) |
| BGaming | int | bet in minor units (100 = 1.00) |
| Relax | int | total bet in minor units (100 = 1.00) |
| Push Gaming | int | total bet in minor units (100 = 1.00) |
| Play'n GO | int | denomination rung — the round's total bet is coins × lines × denom |
| Pragmatic | float | coin value — the round's total bet is coin × paylines |

The last two are not a total bet, and neither is BGaming's ladder on its older games (a per-line bet). Do not convert any of them yourself: `TotalBets` (here) and `TotalBet` (on each grant) are the total bet in money, already converted per game.


=========== data-id="fr-grant" data-group="Integration" data-parent="free-rounds" data-title="Grant" data-icon="circle-plus" data-lead="Award rounds."

@endpoint POST https://launch-ops.codejackpot.online/api/v1/freeround/grant

## Request

```json
{"GrantID":"welcome-2026-09-18-p123","UserID":"player-123","GameID":"2319","Rounds":10,"Stake":100,"Currency":"EUR","ExpiresAt":1792000000,"Note":"welcome bonus"}
```

| Field | Required | Notes |
| --- | --- | --- |
| `GrantID` | yes | your idempotency key, unique within your account. The same `GrantID` again returns the existing grant with `Created:false` and awards nothing — a timed-out call is always safe to retry |
| `UserID` | yes | your player id; the player does not have to have launched anything yet |
| `GameID` | yes | as above |
| `Rounds` | yes | 1..10000 |
| `Stake` / `StakeF` | no | the stake — `Stake` when `Kind` is `int`, `StakeF` when `float`, never both (`1045`). It must be on the `/stakes` ladder for the same currency. Omit both for the game's default |
| `Currency` | no | defaults to your default currency; must be enabled on your account |
| `ExpiresAt` | no | unix seconds; default +30 days, at most one year |
| `Note` | no | free text, echoed by `query` |

## Response

`data.Grant` is the grant record (also what `query` returns): `GrantID`, `UserID`, `Provider`, `GameID`, `FullGameID`, `StakeKind`, `Stake`, `StakeF`, `Currency`, `Total`, `Remaining`, `Consumed`, `State` (`active` → `exhausted` / `expired` / `revoked`), `Declined`, `GrantedAt`, `ExpiresAt`, `WinGold` (what the rounds have paid so far, in minor units × 100), `LastRound`, `Note`. `data.Created` says whether this call created it.

Each grant also carries `StakeValue` (its stake as a plain number) and `TotalBet` — the money a paid round at that stake debits, i.e. the bet to show for each of its rounds (see *Showing the bet of a free round*).

An id that names no game is `1042`; a supported game whose ladder we do not hold is `1043`.


=========== data-id="fr-query" data-group="Integration" data-parent="free-rounds" data-title="Query & Revoke" data-icon="search" data-lead="Read your grants back, or take back what is left."

@endpoint POST https://launch-ops.codejackpot.online/api/v1/freeround/query

Takes any of `GrantID`, `UserID`, `GameID`, `State`, `Limit` (default and maximum 1000) and returns `{"Grants":[…]}`, newest first. A query that matches nothing is a success with an empty list, never an error. You only ever see your own grants.

@endpoint POST https://launch-ops.codejackpot.online/api/v1/freeround/revoke

Takes `GrantID` or `UserID` (at least one) and returns `{"RevokedCount":n}`. It sets `Remaining` to 0 and `State` to `revoked`; rounds already played and their wins stand; calling it again is a no-op with `RevokedCount:0`.

> [!TIP]
> A declined grant can still be revoked, which is how you take declined rounds back and re-award them under a new `GrantID`.


=========== data-id="fr-effects" data-group="Integration" data-parent="free-rounds" data-title="Wallet & player view" data-icon="eye" data-lead="What your wallet and your player see during free rounds."

## What your wallet sees

A free round sends **no bet callback**. It sends exactly one `TransferInOut` with `Reason:"win"`, `IsEnd:true`, `FreeRound:true`, `GrantID` set to your key, `Currency` set, and `Amount` equal to the win — `0.0000` when the round lost, so you can close the round. Answer it like any win. In your reports the round appears with a zero stake, so a free-round win lowers your GGR by the win. `WinGold` on the grant accumulates the same amounts.

If a grant cannot be applied for any reason (wrong currency, expired, revoked, exhausted, declined), the spin is played and charged as an ordinary paid round — a player is never refused a spin because of a grant. A grant in a currency the player did not launch in is simply skipped, not consumed.

## Showing the bet of a free round

A free round sends no bet callback, so there is no stake in your wallet history to read. To show what each free round was worth, read `TotalBet` from the grant (`/grant`, `/query`), or `TotalBets[i]` from `/stakes` where `StakeValues[i]` is the grant's stake. It is the money a **paid** round at that stake debits — the `Amount` our bet callback would carry, in the grant's currency — so it is in the same unit as every other amount we send you, for every provider. For a currency whose callbacks carry a scaled integer instead of money (GEMS: a 1.5 MGEMS bet arrives as `1500000`), `TotalBet` is in the unit the game shows (MGEMS) — multiply it by the same factor your callbacks use. Where a game lets players choose lines or coins (Play'n GO), it is the bet at the game's standard lines and coins, which is what a free round is played at. It is also the right base for liability: `TotalBet × Remaining`.

Do not show `Stake`, `StakeF` or `StakeValue` as a bet. They are ladder rungs: on Pragmatic a **coin** (a 0.10 coin on a 20-line game is a 2.00 bet), on Play'n GO a **denomination** (× coins × lines), on BGaming's older games a **per-line** bet, and on the minor-unit providers 100× the money. `TotalBet` has already done that conversion. It is `0` when we cannot state a game's multiplier: show no bet rather than the raw stake.

## What the player sees

| Provider | Presentation |
| --- | --- |
| Hacksaw | a dialog on launch that the player accepts or declines; declining consumes nothing and only affects that offer |
| Quickspin | a token counter beside the balance, spent down per round |
| BGaming | a free-rounds counter in the game with its own balance bucket; the bet is locked to the granted stake |
| Play'n GO | a "Free Games" prompt, then a dedicated free-game display with the stake locked |
| Relax | the campaign is announced on login; the stake is locked to the grant |
| Push Gaming | an operator free-rounds fund in the game's wallet panel |
| Pragmatic | the client's free-rounds banner; the coin is locked to the grant |

> [!NOTE]
> Verified on this platform on 2026-09-18 with Relax and Play'n GO end to end: grant → ordinary launch → rounds played at the grant's stake with no bet callback and one win callback per round → exhaustion → the next spin charged normally → decline, expiry and revoke never spend a round.


=========== data-id="rtp" data-group="Integration" data-title="RTP API" data-icon="percent" data-lead="Set your players' return across every game and every credential."

@endpoint PUT https://api.codejackpot.online/v1/rtp

```json
{"target":0.80}
```

A fraction, or a percentage such as `80`; `0` restores the vendor default. Read it back with `GET /v1/rtp`, or use the panel's **Rtp Control** page.

- The reply carries the band you may set within (`min` / `max`, agreed per account).
- It applies within a minute to new rounds; a round already in play finishes as it started.
- Each game's own RTP in `/v1/games` is the vendor's figure and does not change with your target.
- Requires the standard credential or a panel owner/ops user.

## Daily RTP cap

Off by default. When on, no UTC day ends with your players' won ÷ wagered above the cap.

@endpoint PUT https://api.codejackpot.online/v1/rtp/daily

```json
{"cap":0.95,"minWageredUsd":2000}
```

`cap` is a fraction or a percentage such as `95`; `0` turns the cap off. Either field may be sent alone. Read it back with `GET /v1/rtp/daily`, or use the panel's **Rtp Control** page.

- Every round's win is known before it is served. A round whose win would lift today's return above the cap is replaced by one that fits; a bonus buy gets a smaller round of the same buy.
- Until `minWageredUsd` has been wagered today, the day's budget is cap × that amount, so early players still win normally. A day that ends with at least that much wagered ends at or under the cap.
- Every currency is counted in USD at your currency rates. A currency with no rate cannot be valued and is not capped; the reply lists them in `unvaluedCurrencies`.
- Streamer and sandbox play is neither counted nor capped. The day resets at 00:00 UTC.
- A cap near a game's natural return lowers your long-run return too: the big wins it replaces are part of that return.
- Requires the standard credential or a panel owner/ops user.

The reply carries today's totals:

```json
{"enabled":true,"cap":0.95,"minWageredUsd":2000,"dayBoundary":"00:00 UTC",
 "today":{"day":"2026-09-28","wageredUsd":18342.5,"wonUsd":16912.08,"rtp":0.922,"rounds":40211,"swaps":37,"forced":0,"since":"2026-09-28T08:14:03Z"},
 "unvaluedCurrencies":[]}
```

| Field | Meaning |
|---|---|
| `today.swaps` | rounds replaced by one that fits |
| `today.forced` | picks where nothing in the pool fit and its smallest outcome was paid (a bonus buy late in a spent day) |
| `today.since` | first round counted today — the cap counts from the moment it was on |

## Max win per round

Off by default. When on, no single round pays more than you allow, for every player without a max win of their own.

@endpoint PUT https://api.codejackpot.online/v1/rtp/maxwin

```json
{"mult":500,"usd":10000}
```

`mult` caps a round's win as a multiple of its stake, `usd` as an amount; with both set the lower one applies, and `0` turns that part off. Either field may be sent alone. Read it back with `GET /v1/rtp/maxwin`, or use the panel's **Rtp Control** page.

- A round that would pay more is replaced by one that fits; a bonus buy gets a smaller round of the same buy. Nothing is cut and no button is hidden.
- `usd` is valued at your currency rates, like the daily cap; a currency with no rate is held to the multiple only. The multiple is 1×–1,000,000×, the amount $1–$1,000,000,000 (or `0`).
- It works together with your daily cap, and players under it stay in your day: only a player's own settings (below) take them out of it. A player's read-back shows it as `"maxWin":"operator"`.
- Your shops, sandbox and streamer keys follow it; a shop's own max win can never be higher. Changes apply within a minute.
- Keep `usd` above your largest stake × a game's smallest win, or that stake cannot win anything on that game.
- Requires the standard credential or a panel owner/ops user.

## Player settings

One player's own payout target, daily cap and max win per round, replacing yours for that player only.

@endpoint PUT https://api.codejackpot.online/v1/rtp/players/{userId}

```json
{"target":0.95,"dayCap":{"rtp":1.2,"minWageredUsd":100},"maxWin":{"mult":1000,"usd":5000}}
```

Values are fractions or percentages. A part not in the body is unchanged; a part sent as `null`, or named in `"clear":["target","dayCap","maxWin"]`, follows yours again. `userId` is the id you launch the player with.

- Each setting a player has replaces yours; the ones they do not have follow yours. `0` is the player's own off: a target of `0` pays each game's vendor return, a daily cap of `0` means no daily cap for them, a max win of `0` and `0` means no max win.
- The target must be inside your band (`min` / `max` of `GET /v1/rtp`) or `0`. A daily cap is 5%–500%; a max win multiple 1×–1,000,000×, an amount $1–$1,000,000,000.
- A player's own daily cap judges their own UTC day, their won ÷ their wagered. Your cap no longer judges their rounds. A player with any setting of their own is kept out of your day entirely: their rounds count only on their own day (judged by their own cap, or by your cap settings applied to their own day when they have none), so a special arrangement never moves your daily totals. Their play is still billed and listed in your bet history as usual.
- Every payout respects a player's settings: spins, bonus buys, gambles and in-game choices. A win that would pass their limit is replaced by one that fits; nothing is cut and no button is hidden.
- Their max win replaces yours whole: with only a multiple set, no amount limit applies to them.
- When the player plays under more than one of your credentials (your own and a shop's), name the one with `"launchApp"`.
- Settings can be made before the player's first launch and apply from it. Changes apply within a minute.
- `GET /v1/rtp/players/{userId}` reads one player, `GET /v1/rtp/players` lists every player with settings of their own, `DELETE /v1/rtp/players/{userId}` sends every part back to yours. In the panel: **Rtp Control → Player settings**, or **Users → Settings**.
- Requires the standard credential or a panel owner/ops user.

```json
{"userId":"player-123","launchApp":"youroperator","pid":4410021,"seen":true,"exists":true,
 "own":{"target":0.95,"dayCap":{"rtp":1.2,"minWageredUsd":100},"maxWin":null},
 "effective":{"target":0.95,"vendorDefault":false,"dayCap":{"rtp":1.2,"enabled":true,"minWageredUsd":100},"maxWin":{"mult":5000,"usd":0}},
 "source":{"target":"player","dayCap":"player","maxWin":"operator"},
 "today":{"day":"2026-10-23","wageredUsd":340,"wonUsd":281.5,"rtp":0.828,"rounds":712,"swaps":3,"forced":0,"since":"2026-10-23T09:12:44Z"}}
```

| Field | Meaning |
|---|---|
| `own` | the player's own parts; `null` = follows yours |
| `source` | per part, whose setting the player runs with: `player` or `operator` |
| `seen` | the player has launched at least once (`pid` is then their platform id) |
| `today` | their own day, when they have a daily cap of their own |

## Kajot Joker Jackpot

Every Kajot game shows Kajot's Joker Jackpot: four pots fed by every Kajot stake of your players, each paying out inside its drop range. Off, Kajot's values, or your own.

@endpoint PUT https://api.codejackpot.online/v1/jackpots/kajot

```json
{"enabled":true,"levels":[{"level":"bronze","seed":10,"min":30,"max":100,"sharePct":0.1375},
 {"level":"silver","seed":300,"min":500,"max":800,"sharePct":0.1375},
 {"level":"gold","seed":1000,"min":1300,"max":1600,"sharePct":0.1375},
 {"level":"platinum","seed":2000,"min":2500,"max":3000,"sharePct":0.1375}]}
```

`{"enabled":false}` switches it off (no stake feeds the pots, the games show no jackpot); `{"vendor":true}` goes back to Kajot's values. Read it back, with your pots, with `GET /v1/jackpots/kajot`, or use the panel's **Jackpots** page.

- Rules: 0 < seed < min <= max, 0 < sharePct <= 2 (percent of each stake). Amounts are EUR, whole cents; players see them in their currency at its game scale.
- Changes apply within a minute. Money players already put into a pot stays in it; a new drop point is drawn inside the new range.
- Players get back every cent they put in; your cost is the start values. `longRunPct` in the reply is what the jackpot pays back over time, as a percent of your Kajot stakes.
- Your shops, sandbox and streamer keys follow your setting. Requires the standard credential or a panel owner/ops user.

## Dragon Chase Grand

Quickspin's Dragon Chase awards its Grand for all 15 Dragon Pearls: a progressive pot fed by every Dragon Chase stake of your players, paying out inside its drop range. Default values (start 500, drops 750-1,250, 1 %), or your own.

@endpoint PUT https://api.codejackpot.online/v1/jackpots/dragonchase

```json
{"levels":[{"level":"Grand","seed":200,"min":300,"max":500,"sharePct":1}]}
```

`{"defaults":true}` goes back to the default values. Read it back, with your pot, with `GET /v1/jackpots/dragonchase`, or use the panel's **Jackpots** page. It cannot be switched off: it is the game's own top prize - smaller values cost less.

- Rules: 0 < seed < min <= max, 0 < sharePct <= 5 (percent of each stake). Amounts are EUR, whole cents; players see them in their currency at its game scale.
- Changes apply within a minute. Money players already put into the pot stays in it; a new drop point is drawn inside the new range.
- Players get back every cent they put in; your cost is the start value. `longRunPct` in the reply is what the jackpot pays back over time, as a percent of your Dragon Chase stakes.
- Your shops, sandbox and streamer keys follow your setting. Requires the standard credential or a panel owner/ops user.

## Dream Drop

Every Relax Dream Drop game (Royal Potato Dream Drop and the other Dream Drop titles) shares one set of pots per credential, fed by every Dream Drop stake of your players. Mega, Major, Maxi, Midi and Rapid each drop when a spin takes the pot to a point hidden inside its range; the Daily drops once in each 8-hour window (22-06, 06-14, 14-22 UTC). Default values, or your own.

@endpoint PUT https://api.codejackpot.online/v1/jackpots/dreamdrop

```json
{"levels":[{"level":"Mega","seed":100,"min":150,"max":300,"sharePct":0.05},
 {"level":"Major","seed":25,"min":37.5,"max":75,"sharePct":0.1},
 {"level":"Maxi","seed":5,"min":7.5,"max":15,"sharePct":0.15},
 {"level":"Midi","seed":1,"min":1.5,"max":3,"sharePct":0.2},
 {"level":"Rapid","seed":0.2,"min":0.3,"max":0.6,"sharePct":0.3},
 {"level":"Daily","seed":2,"sharePct":0.2}]}
```

These are the default values; `{"defaults":true}` goes back to them. Read it back, with your pots, with `GET /v1/jackpots/dreamdrop`, or use the panel's **Jackpots** page. It cannot be switched off: it is the games' own jackpot - smaller values cost less.

- Send all six tiers, in this order. Rules: 0 < seed < min <= max (up to 10,000,000), 0 < sharePct <= 5 (percent of each stake). The Daily has no range - it drops by time - so only its `seed` and `sharePct` count. Amounts are EUR, whole cents; players see them in their currency at its game scale.
- Changes apply within a minute. A change never takes back what players already put into a pot.
- `longRunPct` in the reply is what the jackpot pays back over time, as a percent of your Dream Drop stakes; `pots` lists each pot's value, drops and paid amount per credential.
- Your shops, sandbox and streamer keys follow your setting. Requires the standard credential or a panel owner/ops user.


=========== data-id="casinojackpot" data-group="Integration" data-title="Casino jackpot" data-icon="coins" data-lead="Your own jackpot across the providers you choose, shown on your site."

Every eligible bet your players place, on the providers you choose, feeds the jackpot's tiers; each tier drops on the schedule you set and is paid into the winner's wallet. Nothing is drawn in the games: show it on your site from the feed. Set it up on the panel's **Jackpots** page - it tells you what your values mean at your own turnover - or here.

@endpoint PUT https://api.codejackpot.online/v1/jackpots/casino

```json
{"enabled":true,"currency":"EUR","providers":[],"real":true,"shops":true,"sandbox":false,"streamer":false,"public":true,
 "tiers":[{"id":"mega","name":"Mega","seed":1000,"growthPct":0.3,"minBet":0.2,"mode":"between","dropMin":4000,"dropMax":6000},
          {"id":"daily","name":"Daily","seed":50,"growthPct":0.2,"minBet":0,"mode":"every","everyHours":24,"maxPot":500,
           "winLimits":[{"wins":1,"hours":24}]}],
 "winLimits":[{"wins":3,"hours":168}]}
```

- `mode` `every`: once each `everyHours` (1 hourly, 24 daily, 168 weekly), at a hidden random moment; `maxPot` drops it at once on reaching that. `mode` `between`: at a hidden amount between `dropMin` and `dropMax`.
- `growthPct`: how much of each bet the tier takes (0-10). `minBet`: the smallest bet that counts. 1 to 10 tiers; amounts in whole cents of the jackpot's currency (EUR or USD, kept once there are pots).
- `real` your players, `shops` your shops' players (same pots), `sandbox` / `streamer` (pots of their own). `providers` empty = all.
- Payouts are your promotion: not in the GGR your fee is charged on, and on top of the games' RTP. Each reaches your wallet as its own `/Cash/TransferInOut`: `GameID` `casino_jackpot`, a `RoundID` starting with `jp`, `Reason` `win`, `IsEnd` true, in the player's currency (converted at your contract rate, else the market rate; rounded down to their cent).
- Off until you switch it on (`"enabled":true`). Off means off: bets placed while it is off never count.
- Every reply carries `payback`: `gamesPct` (your RTP target, else your games' last 7 days, else 96), `jackpotPct` (what the jackpot adds on top, as a percent of the bets it takes), `totalPct`, `level` (`ok`, `above-target`, `over-100`) and a `message`. The jackpot is on top of the games' RTP, not part of your RTP target: check it before you switch it on. A tier holding players' money is removed only after it pays out: `"closing":true` drops it on its next eligible bet.
- `winLimits`: how often one player can win - on a tier (its own wins) and on the jackpot (wins of every tier together), up to 3 each: at most `wins` wins in any `hours` hours (1 to 8,784), counted back from each bet. A player at a limit keeps playing and still feeds the pot, but the drop goes to the next eligible bet of a player under the limits - the jackpot pays out the same, to more players. A player = one user id of one key (yours or a shop's). None = any number of wins. A `PUT` replaces everything: send the limits you keep, and state them in your jackpot rules.

@endpoint GET https://api.codejackpot.online/v1/jackpots/casino/feed?currency=USD

What your site shows, per tier: `amount`, `currency` (and `shown` in the asked currency), `mode` with `everyHours` + `periodEndsAt` (it drops before then) or `mustDropBy`, `minBet`, `winLimits`, `drops`, `lastWin` {`amount`, `at`, `userId`}; the jackpot's own `winLimits`. With `"public":true` the settings return a `publicUrl` your pages can read without keys (winners' ids masked; `"rotatePublic":true` replaces it).


=========== data-id="live-casino" data-group="Integration" data-title="Live casino" data-icon="play" data-lead="Pragmatic Play Live tables through the same launch API and wallet."

Pragmatic Play Live — roulette, blackjack, baccarat, sic bo and game shows (Money Time, Sweet Bonanza CandyLand, Treasure Island, Snakes & Ladders, Mega Sic Bac, Mega Wheel) — streamed from the studio. **We switch it on per account**: ask under Configuration → Live Casino. Live casino GGR is billed at the live casino rate shown under Configuration → Live Casino, whatever your fee on other games (see [Billing API](#billing)).

## Going live

1. **Ask for it** under Configuration → Live Casino. When we switch it on, that page lists your tables and which of your currencies play.
2. **Reload your game list** ([Game List](#game-list)). The tables are games with `"provider":"pplive"`; there is no separate category field, so show provider `pplive` in your lobby's live casino section. A lobby that only shows the providers it already knows will not show the tables.
3. **Launch on your standard key, in real mode**: the same launch call as a slot, with the table's `gameId`. The streamer and sandbox keys answer `1034`, and there is no demo mode.
4. **Test with a real account and a small stake.** There is no fun mode, so the first test bet is a real bet. Your wallet sees a debit for each bet and one credit when the dealer settles (see Your wallet below).

## Catalogue and launch

Once on, the tables appear in [Game List](#game-list) with `"provider":"pplive"` (`"providerName":"Pragmatic Play Live"`), an image, and `enabled`. Launch a table exactly like a slot, with its `gameId` (see [Game Launch](#game-launch)). Switch tables, or the whole provider, on and off under Configuration → Live Casino or with `PUT /v1/games/{id}/enabled` and `PUT /v1/providers/pplive/enabled`.

| key | live tables |
| --- | --- |
| standard | yes — real money, your wallet |
| streamer | **no** — launch answers `1034` |
| sandbox | **no** — every live bet is a real bet, so a fun wallet cannot place one (`1034`) |

There is no demo mode for live tables.

## Your wallet

Live rounds reach your wallet as ordinary [Cash/TransferInOut](#transfer) legs; the game id is the table's `gameId`.

- **Each bet is a debit.** A player who bets on several spots, doubles, splits or buys insurance can send several debits in one game round; each debit carries its own round id.
- **The result is one credit** on the first of those rounds — the win, or `0` for a loss — and the others close with a `0` credit, so every round id you saw debited is closed.
- A round normally settles within a minute of the bet (game shows with a bonus take a few minutes). A round whose result never arrives is closed with `0` after two hours.
- A bet the table refuses (placed after betting closed, or over the table limit) never reaches your wallet.

Answer debits fast: a live bet must be confirmed while betting is open, and the studio's own round trip is about 0.7 s. A bet clicked in the last second before betting closes can be refused by the table.

## Currencies

Live tables play in your player's currency with round chips: for USD, EUR, GBP and CHF one table unit is 1; MKD 50, ALL 100, DLS 20, RBX 200, THB 50, BRL 5. Any other fiat currency with an exchange rate also plays, priced by that rate (its chips can show uneven amounts). Free-coin and other non-cash currencies never play. Configuration → Live Casino lists each of your currencies and whether it plays.

> [!NOTE]
> A player is at one live table at a time: opening a second table moves the player's session there.


=========== data-id="reports" data-group="Integration" data-title="Reports API" data-icon="chart-no-axes-column" data-lead="GGR and fee, grouped the way you need."

@endpoint GET https://api.codejackpot.online/v1/reports/ggr?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|game|provider|currency

GGR and fee; send `Accept: text/csv` for CSV. `from` is the first day, `to` the day AFTER the last one (exclusive; UTC days): today alone is `from=<today>&to=<tomorrow>`. Bets and wins are summed in each round's own currency: add `split=currency` for a row per group and currency (what the panel shows), or use `group=currency`; `ggrUsd` adds currencies up at each round's USD rate.

@endpoint GET https://api.codejackpot.online/v1/reports/players?from=YYYY-MM-DD&to=YYYY-MM-DD&search=&limit=100&skip=0

User Statistics: each player's real-money rounds in the range, one row per player and currency (`userId`, `currency`, `rounds`, `stake`, `win`, `ggrUsd`, `lastPlayed`), most recent first, and `totals` per currency. Streamer and sandbox play is not included. Same `from`/`to` rule as above.

@endpoint GET https://api.codejackpot.online/v1/streamers/summary

Streamer accounts and rounds (never billed).

@endpoint GET https://api.codejackpot.online/v1/audit

Your account's audit log: the last 200 changes, newest first, each with `at`, `actor` (the panel login or credential that made it), `action` (for example `rtp_max_win` or `dreamdrop_jackpot`), `target` and the change's `detail`.


=========== data-id="billing" data-group="Integration" data-title="Billing API" data-icon="receipt" data-lead="Prepaid credit, drawn down by a share of your net GGR."

@endpoint GET https://api.codejackpot.online/v1/billing/period

The open period: GGR, carry-in, fee, credit available/remaining, credit state (`ok`, `warning`, `grace`, `suspended`).

@endpoint GET https://api.codejackpot.online/v1/billing/statements

Closed periods, frozen. `GET /v1/billing/statements/{id}/pdf` — the statement as a PDF (`id` from the list, or the open period's id for an interim statement).

@endpoint POST https://api.codejackpot.online/v1/billing/topups

```json
{"amount":1000,"currency":"USD","method":"wire","reference":"INV-42"}
```

Raises a top-up request; it is applied when we confirm the payment. `GET /v1/billing/topups` lists them.

## How the fee works

Fee = `ggrRate` × max(0, net GGR + carry-in) over the period; net GGR is stakes − wins valued in USD at the rate recorded per round.

Live casino rounds pay the live casino rate, `liveGgrRate` in `GET /v1/billing/period`, whatever your `ggrRate`. The fee = max(0, `ggrRate` × (other GGR + carry-in) + `liveGgrRate` × live casino GGR), and `period.liveGgrUsd` is the live part of the period's GGR.

> [!WARNING]
> When credit is exhausted in enforce mode, new launches with the standard credential are refused with `1040` until a top-up is confirmed; games already open keep settling, and streamer and sandbox play is never affected.


=========== data-id="credits" data-group="Integration" data-title="Buying credits" data-icon="wallet" data-lead="Top up your prepaid credit with crypto, credited as soon as the payment confirms."

Billing → **Buy Credits** in the back office (owner and finance users).

1. Choose the amount — **at least $10**.
2. Pay on the OxaPay page that opens, in the coin you like (USDT, BTC, ETH, TRX, LTC…). Every payment is converted to USDT.
3. The credit is added by itself when the payment confirms, usually within minutes. **$1 paid is $1 of credit.**

Your API fee is drawn from the credit as rounds settle: at a 10% fee, $100 of credit covers $1,000 of net GGR. The page shows the cover for the amount you type, your credit remaining and every crypto payment with its status (`pending`, `paying`, `paid`, `expired`).

> [!TIP]
> A payment that shows `pending` after you paid can be checked at once with **Check**; we also ask OxaPay about open payments every two minutes, so a payment is never lost if a notification is.

Accounts with unlimited credit do not see the option. Wire transfers and other methods still go through Billing → Payment (a request we confirm by hand).


=========== data-id="errors" data-group="Appendix" data-title="Error codes" data-icon="circle-alert" data-lead="Codes you can receive, and what they mean."

## Launch

| code | meaning |
| --- | --- |
| 1002 | unknown AppID |
| 1011 / 1023 | bad signature / stale timestamp |
| 1014 | the calling address is not in this credential's IP allow-list |
| 1017 | `Currency` is not enabled on your account |
| 1001 | operator suspended |
| 1004 | game not available on the platform |
| 1030 | provider or game not entitled to your account |
| 1033 | game disabled by you (panel or `/v1/games/{id}/enabled`) |
| 1040 | prepaid credit exhausted — top up to resume (standard credential only) |
| 1034 | live casino with the sandbox or streamer credential — live tables play on the standard key only |
| 1035 | streamer and sandbox play are not available on self-registered accounts |

## API calls

Every signed call to `https://api.codejackpot.online` can answer:

| code | HTTP | meaning |
| --- | --- | --- |
| 1011 | 401 | `AppID`, `Ts` or `Sign` missing, or the signature does not match |
| 1023 | 401 | `Ts` missing or more than 60 s away from our clock |
| 1002 | 401 | unknown AppID |
| 1012 | 403 | the calling address is not in this credential's IP allow-list |
| 1001 | 403 | operator not active |
| 1029 | 429 | rate limit for this credential exceeded — retry after the `Retry-After` header (1 s) |
| 1050 | 403 | your panel role cannot make this change |
| 1000 | 400 | malformed JSON or an invalid value |

## Free rounds

| code | meaning |
| --- | --- |
| 1042 | the id names no game |
| 1043 | a supported game whose ladder we do not hold (also answered for NoLimit, NetEnt and Red Tiger) |
| 1045 | both `Stake` and `StakeF` were sent |

## Back office (sign-up, security, buying credits)

| code | meaning |
| --- | --- |
| 1029 | too many attempts — wait for `Retry-After` |
| 1060 | sign-up is closed at the moment |
| 1061 | the email is not a valid address, or its provider is not accepted |
| 1062 | the password is too weak (the message says why) |
| 1063 | an account already uses this mailbox |
| 1064 | the email link is invalid, expired or already used |
| 1067 | confirm your email first (a new link was sent) |
| 1024 | wrong authenticator or recovery code |
| 1070 | buying credits is not open to this account or role |
| 1071 | the amount is outside the minimum ($10) and maximum |
| 1072 | the payment page could not be created — try again |


=========== data-id="providers" data-group="Appendix" data-title="Providers" data-icon="layers" data-lead="Every provider, its free-round support, and live casino."

| Provider | `provider` | Free rounds |
| --- | --- | --- |
| Pragmatic Play | `pp` | supported |
| Hacksaw Gaming | `hacksaw` | supported |
| Play'n GO | `playngo` | supported |
| Relax Gaming | `relax` | supported |
| BGaming | `bgaming` | supported |
| Push Gaming | `pushgaming` | supported |
| Quickspin | `quickspin` | supported |
| Wazdan | `wazdan` | supported |
| NoLimit City | `nolimit` | not supported |
| NetEnt | `netent` | not supported |
| Red Tiger | `redtiger` | not supported |
| Amatic Industries | `amatic` | not supported |
| Greentube | `greentube` | not supported |
| Kajot Games | `kajot` | not supported |
| Pragmatic Play Live | `pplive` | live casino — switched on per account, no free rounds (see [Live casino](#live-casino)) |

Which of them are entitled to your account, and every game with its RTP and release date, is in `GET /v1/games` (see [Game List](#game-list)); each row's `freeRounds` says whether that game takes free rounds.


=========== data-id="currencies" data-group="Appendix" data-title="Currencies & keys" data-icon="dollar-sign" data-lead="Your enabled currencies and credentials."

@endpoint GET https://api.codejackpot.online/v1/currencies

Enabled currencies with scale, decimals, symbol and USD rate.

@endpoint GET https://api.codejackpot.online/v1/keys

Your credentials (no secrets). `POST /v1/keys/rotate` `{"kind":"standard"}` — new secret, shown once. `PUT /v1/keys/{kind}/ipallow` — restrict a credential to your addresses (see [Credentials](#credentials)).


=========== data-id="panel" data-group="Appendix" data-title="Back office" data-icon="settings" data-lead="The panel shows your account, players, reports and billing."

`https://panel.codejackpot.online/panel/` — sign in with your email, password and authenticator code.

| Role | Can |
| --- | --- |
| owner | everything: keys and IP allow-lists, wallet URL, panel users, games, payout target, top-ups |
| finance | buy credits and request top-ups |
| ops | switch games and providers on or off, set the payout target |
| readonly | view only — every change above is refused |

Every role sees players, rounds, reports and billing.

Each person manages their own security under Profile → Security: email confirmation, two-factor authentication on or off, and recovery codes (see [Open an account](#signup)).

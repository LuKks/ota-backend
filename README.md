# ota-backend

Firmware hosting for Over-The-Air updates

Warning: This is experimental. API and internals will change.

## API

<details>
<summary>Authorization</summary>
<br>

Once you have a firmware created, use the following:

```
x-ota-firmware-id: <id>
x-ota-firmware-key: <key>
```

Devices need to send:

```
x-ota-firmware-id: <firmware-id>
x-ota-device-id: <random-id>
```

Status code

- 401 `INVALID_AUTH`
</details>

<details>
<summary>Create a new firmware</summary>

#### `POST /v1/create`

Response body

```js
{
  id: Number,
  key: String
}
```

Status code

- 200
</details>

<details>
<summary>Allow a device to use OTA</summary>

#### `POST /v1/firewall/allow`

Request headers

```js
{
  'x-ota-firmware-id': String,
  'x-ota-firmware-key': String
}
```

Request body

```js
{
  device_id: String // Use 'all' to allow anyone
}
```

Status code

- 200
</details>

<details>
<summary>Deny a device to use OTA</summary>

#### `POST /v1/firewall/deny`

Request headers

```js
{
  'x-ota-firmware-id': String,
  'x-ota-firmware-key': String
}
```

Request body

```js
{
  device_id: String // Use 'all' to remove the anyone allowance
}
```

Status code

- 200
</details>

<details>
<summary>Upload a new OTA update</summary>

#### `POST /v1/upload`

Request headers

```js
{
  'x-ota-firmware-id': String,
  'x-ota-firmware-key': String
}
```

Request body

```js
{
  file: Object // E.g. send a file via multipart/form-data
}
```

Response body

```js
{
  hash: String
}
```

Status code

- 200
</details>

<details>
<summary>Check for updates</summary>

#### `POST /v1/check/?hash=<h>`

Request headers

```js
{
  'x-ota-firmware-id': String,
  'x-ota-device-id': String
}
```

Response body (on status 200)

```js
{
  hash: String
}
```

Status code

- 200 New hash
- 204 Hash is up to date
- 404 `FIRMWARE_NOT_UPLOADED`
</details>

<details>
<summary>Download a firmware</summary>

#### `POST /v1/download/:hash`

Request headers

```js
{
  'x-ota-firmware-id': String,
  'x-ota-device-id': String
}
```

Status code

- 200
- 404 `FIRMWARE_NOT_AVAILABLE`
</details>

## Setup

<details>
<summary>How to self-host</summary>

Set environment variables by using the `.env` file:

```sh
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 1337
```

Run the server:

`node app.js`
</details>

## License

MIT

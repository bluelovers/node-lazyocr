# lazyocr

    a cli for ocr , convert image to text

## install

```bash
npm install -g lazyocr
```

## use

APP TOKEN 請上 https://cloud.baidu.com/ 申請(有免費方案可使用)

### npx

```bash
npx lazyocr --appId "BAIDU_AIP_APP_ID" --appKey "BAIDU_AIP_API_KEY" --secretKey "BAIDU_AIP_SECRET_KEY" 
```

### .env

在目錄下建立 .env 檔案 就可以不需要在每次執行時都輸入 APP TOKEN

```dotenv
BAIDU_AIP_APP_ID=xxxxxxxxxx
BAIDU_AIP_API_KEY=xxxxxxxxxx
BAIDU_AIP_SECRET_KEY=xxxxxxxxxx
```

預設會搜尋目前資料夾下的 .png .jpg 檔案(不包含子資料夾)

```bash
npx lazyocr
```

或者 可以手動指定 檔案

```bash
npx lazyocr xxx.png yyy.jpg
```

也能使用 glob 語法

```bash
npx lazyocr -p *.png
```

當使用 glob 語法時

如果要包含子資料夾 需要額外指定 deep 深度

```bash
npx lazyocr -p *.png --deep 2
```

預設每個檔案只會執行一次 但可以強制忽略

```bash
npx lazyocr --disableCache --overwrite
```

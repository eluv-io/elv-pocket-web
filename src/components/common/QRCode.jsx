import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import QRCodeStyling from "qr-code-styling";

import Logo from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";

const CONFIG = {
  "type": "canvas",
  "shape": "square",
  "width": 540,
  "height": 540,
  "data": "https://eluv.io/",
  "margin": 10,
  "qrOptions": {"typeNumber": "0", "mode": "Byte", "errorCorrectionLevel": "Q"},
  "imageOptions": {"saveAsBlob": true, "hideBackgroundDots": true, "imageSize": 0.4, "margin": 10},
  "dotsOptions": {"type": "dots", "color": "white", "roundSize": true},
  "backgroundOptions": {"round": 0, "color": "#000000"},
  "image": "",
  "dotsOptionsHelper": {
    "colorType": {"single": true, "gradient": false}
  },
  "cornersSquareOptions": {"type": "extra-rounded", "color": "white"},
  "cornersSquareOptionsHelper": {
    "colorType": {"single": true, "gradient": false},
  },
  "cornersDotOptions": {"type": "dot", "color": "white"},
  "cornersDotOptionsHelper": {
    "colorType": {"single": true, "gradient": false},
  }
};

const QRCode = observer(({image, url, className=""}) => {
  const [container, setContainer] = useState(undefined);

  useEffect(() => {
    if(!container) { return; }

    const config = {...CONFIG};
    config.width = container.getBoundingClientRect().width;
    config.height = container.getBoundingClientRect().height;
    config.data = url;
    config.image = image || Logo;

    const qrCode = new QRCodeStyling(config);

    container.innerHTML = "";
    qrCode.append(container);
    //qrCode.download({ name: "qr", extension: "svg" });
  }, [container, CONFIG]);

  return (
    <div
      ref={setContainer}
      data-url={url}
      className={className}
    />
  );
});

export default QRCode;

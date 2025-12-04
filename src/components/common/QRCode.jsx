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
  "imageOptions": {"saveAsBlob": true, "hideBackgroundDots": true, "imageSize": 0.2, "margin": 0},
  "dotsOptions": {"type": "dots", "color": "#545454", "roundSize": true},
  "backgroundOptions": {"round": 0, "color": "#000000"},
  "image": "",
  "dotsOptionsHelper": {
    "colorType": {"single": true, "gradient": false},
    "gradient": {"linear": true, "radial": false, "color1": "#6a1a4c", "color2": "#6a1a4c", "rotation": "0"}
  },
  "cornersSquareOptions": {"type": "extra-rounded", "color": "#adadad"},
  "cornersSquareOptionsHelper": {
    "colorType": {"single": true, "gradient": false},
    "gradient": {"linear": true, "radial": false, "color1": "#000000", "color2": "#000000", "rotation": "0"}
  },
  "cornersDotOptions": {"type": "dot", "color": "#b8b8b8"},
  "cornersDotOptionsHelper": {
    "colorType": {"single": true, "gradient": false},
    "gradient": {"linear": true, "radial": false, "color1": "#000000", "color2": "#000000", "rotation": "0"}
  },
  "backgroundOptionsHelper": {
    "colorType": {"single": true, "gradient": false},
    "gradient": {"linear": true, "radial": false, "color1": "#ffffff", "color2": "#ffffff", "rotation": "0"}
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

    qrCode.append(container);
    //qrCode.download({ name: "qr", extension: "svg" });
  }, [container]);

  return (
    <div ref={setContainer} className={className} />
  );
});

export default QRCode;

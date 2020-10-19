
import fs from 'fs';
import sharp from 'sharp';

import URL_BACKEND from '../config/url';

const compressImage = (file: any, size: number) => {
  const pathSplitted = file.path.split('.');
  const newPath = pathSplitted.slice(0, pathSplitted.length - 1) + '.png';

  if (file.path == newPath) {
    return sharp(file.path)
      .resize(size)
      .png({
        quality: 80
      })
      .toBuffer()
      .then((data) => {    
        fs.writeFile(newPath, data, (err) => {
          if(err){
            throw err;
          }
        });

        const fileNameSplitted = file.filename.split('.');

        const newFileName = fileNameSplitted.slice(0, pathSplitted.length - 1)
          + '.png';

        const urlImage = `${URL_BACKEND}/files/${newFileName}`;

        return {
          id: newFileName,
          path: newPath,
          url: urlImage,
        };
    });
  }

  return sharp(file.path)
    .resize(size)
    .toFormat('png')
    .png({
      quality: 80
    })
    .toBuffer()
    .then(data => {
      fs.access(file.path, (err) => {
        if (!err) {
          fs.unlink(file.path, (err) => {
            if(err) console.log(err);
          });
        }
      });
      
      fs.writeFile(newPath, data, (err) => {
        if(err){
          throw err;
        }
      });

      const fileNameSplitted = file.filename.split('.');

      const newFileName = fileNameSplitted.slice(0, pathSplitted.length - 1)
        + '.png';

      return {
        id: newFileName,
        path: newPath,
        url: newFileName,
      };
  });
}

export default compressImage;

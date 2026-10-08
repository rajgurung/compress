// Inserts a minimal EXIF block (Orientation 6 = rotate 90° clockwise, Make "SecretCam") into a JPEG.
// Usage: node add-exif.mjs <in.jpg> <out.jpg>
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
const jpeg = readFileSync(input);
const make = Buffer.from("SecretCam\0", "latin1");
const tiff = Buffer.alloc(8 + 2 + 2 * 12 + 4 + make.length);
tiff.write("MM", 0, "latin1");
tiff.writeUInt16BE(42, 2);
tiff.writeUInt32BE(8, 4);
tiff.writeUInt16BE(2, 8);
// Make: ASCII, value stored after the IFD.
tiff.writeUInt16BE(0x010f, 10);
tiff.writeUInt16BE(2, 12);
tiff.writeUInt32BE(make.length, 14);
tiff.writeUInt32BE(8 + 2 + 24 + 4, 18);
// Orientation: SHORT 6.
tiff.writeUInt16BE(0x0112, 22);
tiff.writeUInt16BE(3, 24);
tiff.writeUInt32BE(1, 26);
tiff.writeUInt16BE(6, 30);
tiff.writeUInt32BE(0, 34);
make.copy(tiff, 38);
const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
const app1 = Buffer.alloc(4);
app1.writeUInt16BE(0xffe1, 0);
app1.writeUInt16BE(body.length + 2, 2);
writeFileSync(output, Buffer.concat([jpeg.subarray(0, 2), app1, body, jpeg.subarray(2)]));

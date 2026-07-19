import { useEffect, useRef, type ImgHTMLAttributes } from "react";
import { useDelayRender } from "remotion";

export type RasterAlternative =
  | { kind: "decorative" }
  | { kind: "meaningful"; text: string };

export const rasterAlternativeAttributes = (
  alternative: RasterAlternative,
): { alt: string; ariaHidden?: true } => {
  if (alternative.kind === "decorative") return { alt: "", ariaHidden: true };
  const text = alternative.text.trim();
  if (!text)
    throw new Error("A meaningful raster image requires alternative text.");
  return { alt: text };
};

type DecodedImageHandle = { close(): void };
type ImageDecoder = (blob: Blob) => Promise<DecodedImageHandle>;

export const decodeVerifiedImageBlob = async (
  blob: Blob,
  assetId: string,
  decode: ImageDecoder = globalThis.createImageBitmap,
): Promise<void> => {
  if (typeof decode !== "function")
    throw new Error(
      `Approved Director asset ${assetId} cannot be browser-decoded in this environment.`,
    );
  try {
    const decoded = await decode(blob);
    decoded.close();
  } catch (cause) {
    throw new Error(
      `Approved Director asset ${assetId} failed browser decode.`,
      { cause },
    );
  }
};

type VerifiedRasterImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src"
> & {
  alternative: RasterAlternative;
  assetId: string;
  src: string;
};

/**
 * The source has already passed immutable-byte and browser-decode checks before
 * this component mounts. A native image is intentional here: Remotion 4.0.490's
 * <Img> starts HTMLImageElement.decode() twice under React StrictMode, causing
 * one valid decode to be aborted and logged as an EncodingError. We retain
 * deterministic rendering by holding delayRender until this exact DOM image has
 * intrinsic dimensions.
 */
export const VerifiedRasterImage: React.FC<VerifiedRasterImageProps> = ({
  alternative,
  assetId,
  src,
  ...props
}) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { cancelRender, continueRender, delayRender } = useDelayRender();
  const { alt, ariaHidden } = rasterAlternativeAttributes(alternative);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const handle = delayRender(`Loading verified ${assetId} image`);
    let settled = false;
    const complete = () => {
      if (settled) return;
      settled = true;
      continueRender(handle);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      try {
        cancelRender(
          new Error(
            `Approved Director asset ${assetId} failed DOM image load.`,
          ),
        );
      } catch {
        // cancelRender intentionally throws after sealing the renderer error.
      }
    };
    image.addEventListener("load", complete);
    image.addEventListener("error", fail);
    if (image.complete) {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) complete();
      else fail();
    }
    return () => {
      image.removeEventListener("load", complete);
      image.removeEventListener("error", fail);
      if (!settled) complete();
    };
  }, [assetId, cancelRender, continueRender, delayRender, src]);

  return (
    // This wrapper provides the same render hold while avoiding the StrictMode
    // double-decode defect documented above.
    // eslint-disable-next-line @remotion/warn-native-media-tag
    <img
      {...props}
      alt={alt}
      aria-hidden={ariaHidden}
      ref={imageRef}
      src={src}
    />
  );
};

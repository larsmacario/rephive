import { useEffect, useState } from "react";
import { getBodyPhotoUrl } from "../lib/db";
import { M } from "../theme";

export function BodyPhotoImage({
  photoPath,
  alt,
  style,
}: {
  photoPath: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBodyPhotoUrl(photoPath).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  if (!url) {
    return (
      <div
        style={{
          background: M.panel,
          ...style,
        }}
      />
    );
  }

  return <img src={url} alt={alt} style={style} />;
}

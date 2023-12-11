import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import React from "react";
import { colors } from "src/theme";
import "@fontsource/open-sans";
import Head from "next/head";

// 2. Add your color mode config
const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  colors,
  fonts: {
    heading: `'Open Sans', sans-serif`,
    body: `'Open Sans', sans-serif`,
  },
  config,
});

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="application-name" content="Aksarantara" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Aksarantara" />
        <meta
          name="description"
          content="A Progressive Web Application for managing Pegon manuscripts"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        <meta name="msapplication-TileColor" content="#2e3841" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#2e3841" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://pegon.works" />
        <meta name="twitter:title" content="Aksarantara" />
        <meta
          name="twitter:description"
          content="A Progressive Web Application for managing Pegon manuscripts"
        />
        <meta name="twitter:image" content="https://pegon.works/logo.png" />
        <meta name="twitter:creator" content="@YourTwitterHandle" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Aksarantara" />
        <meta
          property="og:description"
          content="A Progressive Web Application for managing Pegon manuscripts"
        />
        <meta property="og:site_name" content="Aksarantara" />
        <meta property="og:url" content="https://pegon.works" />
        <meta property="og:image" content="https://pegon.works/logo.png" />
      </Head>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>
    </>
  );
}

export default MyApp;

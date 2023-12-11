import {
  Box,
  IconButton,
  Flex,
  Heading,
  Image,
  VStack,
  Spacer,
  Link,
} from "@chakra-ui/react";
import React from "react";

const AppLayout = ({ children }) => {

  const linkStyles = {
    textDecoration: "none",
  };

  return (
    <VStack h="100vh" w="100vw" align="stretch" spacing="0">
      <Flex
        bgColor="gray.700"
        w="100vw"
        h="56px"
        borderBottom="1px"
        borderColor="gray.600"
        p={2}
        px={{ base: 2, md: 2 }}
        justify="space-between"
      >
        <Flex display={{ base: "none", md: "flex" }} alignItems="center">
          <Link href="/app" style={linkStyles}>
            <Image p={2} width="48px" src="/logo.png" alt="Pegon Logo" />
          </Link>
          <Link href="/app" style={linkStyles}>
            <Heading size="sm" ml={3}>
              Aksarantara : Pegon - Latin
            </Heading>
          </Link>
        </Flex>
        <Spacer />
      </Flex>
      <Flex
        style={{
          height: "calc(100vh - 56px)",
        }}
      >
        <Box w="100%" h="100%" overflowY="auto">
          {children}
        </Box>
      </Flex>
    </VStack>
  );
};

export default AppLayout;

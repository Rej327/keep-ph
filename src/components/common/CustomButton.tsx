"use client";

import { Button, ButtonProps } from "@mantine/core";
import React from "react";

type Variant = "primary" | "secondary" | "light";

type CustomButtonProps = ButtonProps & {
  variant?: Variant;
  size?: ButtonProps["size"];
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const CustomButton: React.FC<CustomButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  ...props
}) => {
  const getVariantProps = () => {
    switch (variant) {
      case "primary":
        return {
          color: "#1966D1",
          variant: "filled",
        };
      case "secondary":
        return {
          color: "#1966D1",
          variant: "outline",
        };
      default:
        return {
          color: "#5198ad30",
          variant: "filled",
        };
    }
  };

  return (
    <Button {...getVariantProps()} size={size} {...props}>
      {children}
    </Button>
  );
};

export default CustomButton;

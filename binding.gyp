{
  "targets": [
    {
      "target_name": "native-plugin-demo",
      "sources": [
        "native-plugin-demo.c"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "defines": ["_HAS_EXCEPTIONS=0"]
        }]
      ]
    }
  ]
}

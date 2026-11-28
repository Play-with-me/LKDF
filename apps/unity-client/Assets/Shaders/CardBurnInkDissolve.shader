Shader "CuuChau/CardBurnInkDissolve"
{
    Properties
    {
        [PerRendererData] _MainTex ("Sprite Texture", 2D) = "white" {}
        _Color ("Tint", Color) = (1, 1, 1, 1)

        _StencilComp ("Stencil Comparison", Float) = 8
        _Stencil ("Stencil ID", Float) = 0
        _StencilOp ("Stencil Operation", Float) = 0
        _StencilWriteMask ("Stencil Write Mask", Float) = 255
        _StencilReadMask ("Stencil Read Mask", Float) = 255

        _ColorMask ("Color Mask", Float) = 15
        [Toggle(UNITY_UI_ALPHACLIP)] _UseUIAlphaClip ("Use Alpha Clip", Float) = 0

        _DissolveAmount ("Dissolve Amount", Range(0, 1)) = 0
        _BurnEdgeWidth ("Burn Edge Width", Range(0.01, 0.25)) = 0.08
        _BurnEdgeColor ("Burn Ember Color", Color) = (0.95, 0.32, 0.08, 1)
        _InkEdgeColor ("Ink Scorch Color", Color) = (0.07, 0.05, 0.04, 1)
        _NoiseScale ("Noise Scale", Float) = 14.0
        _SheenStrength ("Gold Sheen", Range(0, 1)) = 0.25
        [Toggle] _ReducedMotion ("Reduced Motion", Float) = 0
    }

    SubShader
    {
        Tags
        {
            "Queue" = "Transparent"
            "IgnoreProjector" = "True"
            "RenderType" = "Transparent"
            "PreviewType" = "Plane"
            "CanUseSpriteAtlas" = "True"
        }

        Stencil
        {
            Ref [_Stencil]
            Comp [_StencilComp]
            Pass [_StencilOp]
            ReadMask [_StencilReadMask]
            WriteMask [_StencilWriteMask]
        }

        Cull Off
        Lighting Off
        ZWrite Off
        ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]

        Pass
        {
            Name "Default"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0

            #include "UnityCG.cginc"
            #include "UnityUI.cginc"

            #pragma multi_compile_local __ UNITY_UI_CLIP_RECT
            #pragma multi_compile_local __ UNITY_UI_ALPHACLIP

            struct appdata_t
            {
                float4 vertex   : POSITION;
                float4 color    : COLOR;
                float2 texcoord : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 vertex        : SV_POSITION;
                fixed4 color         : COLOR;
                float2 texcoord      : TEXCOORD0;
                float4 worldPosition : TEXCOORD1;
                float4 mask          : TEXCOORD2;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            sampler2D _MainTex;
            fixed4 _Color;
            fixed4 _TextureSampleAdd;
            float4 _ClipRect;
            float4 _MainTex_ST;
            float _UIMaskSoftnessX;
            float _UIMaskSoftnessY;
            int _UIVertexColorAlwaysGammaSpace;

            float _DissolveAmount;
            float _BurnEdgeWidth;
            fixed4 _BurnEdgeColor;
            fixed4 _InkEdgeColor;
            float _NoiseScale;
            float _SheenStrength;
            float _ReducedMotion;
            float _GlobalReducedMotion;

            float hash21(float2 p)
            {
                p = frac(p * float2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return frac(p.x * p.y);
            }

            float valueNoise(float2 p)
            {
                float2 i = floor(p);
                float2 f = frac(p);
                float2 u = f * f * (3.0 - 2.0 * f);

                float a = hash21(i);
                float b = hash21(i + float2(1.0, 0.0));
                float c = hash21(i + float2(0.0, 1.0));
                float d = hash21(i + float2(1.0, 1.0));

                return lerp(lerp(a, b, u.x), lerp(c, d, u.x), u.y);
            }

            float fbmNoise(float2 p)
            {
                float n = valueNoise(p) * 0.65;
                n += valueNoise(p * 2.07 + float2(7.13, 3.71)) * 0.35;
                return saturate(n);
            }

            v2f vert(appdata_t v)
            {
                v2f OUT;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(OUT);

                float4 vPosition = UnityObjectToClipPos(v.vertex);
                OUT.worldPosition = v.vertex;
                OUT.vertex = vPosition;

                float2 pixelSize = vPosition.w;
                pixelSize /= abs(mul((float2x2)UNITY_MATRIX_P, _ScreenParams.xy));

                float4 clampedRect = clamp(_ClipRect, -2e10, 2e10);
                OUT.texcoord = TRANSFORM_TEX(v.texcoord, _MainTex);
                OUT.mask = float4(
                    v.vertex.xy * 2.0 - clampedRect.xy - clampedRect.zw,
                    0.25 / (0.25 * float2(_UIMaskSoftnessX, _UIMaskSoftnessY) + abs(pixelSize.xy))
                );

                if (_UIVertexColorAlwaysGammaSpace && !IsGammaSpace())
                {
                    v.color.rgb = UIGammaToLinear(v.color.rgb);
                }

                OUT.color = v.color * _Color;
                return OUT;
            }

            fixed4 frag(v2f IN) : SV_Target
            {
                half4 color = (tex2D(_MainTex, IN.texcoord) + _TextureSampleAdd) * IN.color;

                #ifdef UNITY_UI_CLIP_RECT
                half2 m = saturate((_ClipRect.zw - _ClipRect.xy - abs(IN.mask.xy)) * IN.mask.zw);
                color.a *= m.x * m.y;
                #endif

                float amount = saturate(_DissolveAmount);
                float emberWidth = max(_BurnEdgeWidth, 0.01);
                float inkWidth = emberWidth * 0.65;
                float edgeSoft = 0.015;
                float totalBand = emberWidth + inkWidth + edgeSoft;

                // Keep band below 0 when DissolveAmount == 0 so intact cards show zero scorch specks.
                float cut = amount * (1.0 + totalBand) - totalBand;
                float n = fbmNoise(IN.texcoord * max(_NoiseScale, 0.5));
                float dist = n - cut;

                float alphaMask = smoothstep(0.0, edgeSoft, dist);
                clip(alphaMask - 0.0005);

                float inkMask = 1.0 - smoothstep(edgeSoft + inkWidth * 0.35, edgeSoft + inkWidth, dist);
                float emberMask = smoothstep(edgeSoft + inkWidth * 0.25, edgeSoft + inkWidth * 0.85, dist)
                                * (1.0 - smoothstep(edgeSoft + inkWidth + emberWidth * 0.45, totalBand, dist));

                // Gentle diagonal gold-foil sheen across intact card surface (WCAG 2.3.3 Reduced Motion safe).
                float motionScale = 1.0 - saturate(max(_ReducedMotion, _GlobalReducedMotion));
                float sheenSweep = frac(_Time.y * 0.22 * motionScale) * 2.4 - 0.7;
                float sheenCoord = (IN.texcoord.x * 0.72 + IN.texcoord.y * 0.45) - sheenSweep;
                float sheenBand = exp(-pow(sheenCoord * 6.0, 2.0));
                float3 goldSheen = float3(0.98, 0.84, 0.42) * (sheenBand * _SheenStrength * 0.26 * (1.0 - inkMask) * motionScale);

                color.rgb += goldSheen;
                color.rgb = lerp(color.rgb, _BurnEdgeColor.rgb * 1.45, saturate(emberMask * _BurnEdgeColor.a));
                color.rgb = lerp(color.rgb, _InkEdgeColor.rgb, saturate(inkMask * _InkEdgeColor.a));
                color.a *= alphaMask;

                #ifdef UNITY_UI_ALPHACLIP
                clip(color.a - 0.001);
                #endif

                return color;
            }
            ENDCG
        }
    }
}

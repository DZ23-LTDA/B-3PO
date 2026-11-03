package com.dz23.b3po.shell;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Casca de marca do B-3PO para Android.
 *
 * NÃO é o cliente do produto: não abre sessão, não executa ferramenta, não fala com runtime.
 * Serve para provar o pipeline de build/instalação e aplicar a identidade visual enquanto o
 * contrato de sessão/eventos (Fase E) não está congelado. Ver docs/b3po/MOBILE-FEASIBILITY-REPORT.md.
 */
public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int night = Color.parseColor("#000105");
        int white = Color.parseColor("#FCFDFE");
        int silver = Color.parseColor("#D6DBE6");
        int glow = Color.parseColor("#73C4EA");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(night);
        root.setPadding(64, 64, 64, 64);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.b3po_wordmark);
        logo.setAdjustViewBounds(true);
        root.addView(logo, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView title = new TextView(this);
        title.setText("B-3PO Bot Platform");
        title.setTextColor(white);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = 48;
        root.addView(title, titleParams);

        TextView subtitle = new TextView(this);
        subtitle.setText("Casca de marca - cliente pendente do contrato de sessao");
        subtitle.setTextColor(silver);
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subParams.topMargin = 16;
        root.addView(subtitle, subParams);

        TextView badge = new TextView(this);
        badge.setText("v0.0.0 - android shell");
        badge.setTextColor(glow);
        badge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        badge.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        badgeParams.topMargin = 40;
        root.addView(badge, badgeParams);

        setContentView(root);
    }
}
